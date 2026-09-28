import crypto from "node:crypto";
import { ensureDatabaseSchema, getSql } from "@/db";

export type PaymentStatus = "created" | "pending" | "paid" | "failed" | "cancelled" | "refunded";
export type FundsStatus = "not_received" | "held" | "releasable" | "released" | "refunded" | "disputed";
export type PayoutReleaseStatus = "not_ready" | "ready" | "queued" | "processing" | "released" | "failed";
export type PaymentCaseStatus = "none" | "dispute_open" | "refund_processing" | "refund_needs_attention" | "refund_processed" | "refund_failed";

export type PaymentView = {
  id: string;
  bookingId: string;
  provider: "paystack";
  providerReference: string;
  purpose: "full" | "deposit" | "balance";
  amount: number;
  currencyCode: "NGN";
  status: PaymentStatus;
  fundsStatus: FundsStatus;
  authorizationUrl: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type PaystackBank = { name: string; code: string };
export type VendorPayoutProfileView = {
  provider: "paystack";
  recipientCode: string | null;
  accountName: string | null;
  bankName: string | null;
  accountLast4: string | null;
  status: "unconfigured" | "pending" | "verified" | "disabled";
  providerConfigured: boolean;
};

export type AccountPaymentView = PaymentView & {
  vendorName: string;
  customerName: string;
  serviceSummary: string;
  weddingDate: string | null;
  weddingLocation: string;
};

export type BookingPaymentSummary = {
  bookingId: string;
  total: number;
  paid: number;
  outstanding: number;
  currencyCode: "NGN";
  providerConfigured: boolean;
  paymentStatus: "unpaid" | "partially_paid" | "paid" | "refunded";
  fundsStatus: FundsStatus | "not_started";
  releaseStatus: PayoutReleaseStatus;
  vendorPayoutReady: boolean;
  payoutMode: "test" | "live" | "unconfigured";
  releaseEnabled: boolean;
  simulationEnabled: boolean;
  caseStatus: PaymentCaseStatus;
  caseReason: string | null;
  payments: PaymentView[];
};

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at?: string | null;
    customer?: { email?: string };
  };
};

type PaystackTransferResponse = {
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    transfer_code?: string | null;
    transferred_at?: string | null;
  };
};

type PaystackRefundResponse = {
  status: boolean;
  message: string;
  data?: {
    id?: number;
    status?: string;
    amount?: number;
    currency?: string;
    transaction_reference?: string;
    refund_reference?: string | null;
  };
};

function money(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function iso(value: unknown) {
  if (!value) return null;
  return new Date(String(value)).toISOString();
}

function paystackSecret() {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || "";
}

export function isPaystackConfigured() {
  return Boolean(paystackSecret());
}

export function paystackMode(): "test" | "live" | "unconfigured" {
  const secret = paystackSecret();
  if (secret.startsWith("sk_test_")) return "test";
  if (secret.startsWith("sk_live_")) return "live";
  return secret ? "live" : "unconfigured";
}

export function isPayoutSimulationEnabled() {
  return paystackMode() === "test" && process.env.SMITTEN_SIMULATE_PAYOUTS === "true";
}

export function isPayoutReleaseEnabled() {
  const mode = paystackMode();
  return mode === "test" || (mode === "live" && process.env.SMITTEN_ENABLE_LIVE_PAYOUTS === "true");
}

export function isRefundEnabled() {
  const mode = paystackMode();
  return mode === "test" || (mode === "live" && process.env.SMITTEN_ENABLE_LIVE_REFUNDS === "true");
}

async function expireStalePaymentAttempts() {
  const sql = getSql();
  const rows = await sql`
    UPDATE payment_orders
    SET status='cancelled',updated_at=now()
    WHERE status IN ('created','pending')
      AND created_at < now() - interval '24 hours'
    RETURNING id
  `;

  for (const row of rows) {
    await sql`
      INSERT INTO payment_events(id,payment_order_id,event_type,payload)
      VALUES(
        ${crypto.randomUUID()},
        ${String(row.id)},
        'payment.expired',
        '{"reason":"checkout_not_completed_within_24_hours"}'::jsonb
      )
    `;
  }
}

function mapPayment(row: Record<string, unknown>): PaymentView {
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    provider: "paystack",
    providerReference: String(row.provider_reference),
    purpose: String(row.purpose) as PaymentView["purpose"],
    amount: money(row.amount),
    currencyCode: "NGN",
    status: String(row.status) as PaymentStatus,
    fundsStatus: String(row.funds_status) as FundsStatus,
    authorizationUrl: row.authorization_url ? String(row.authorization_url) : null,
    paidAt: iso(row.provider_paid_at),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
  };
}

async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const secret = paystackSecret();
  if (!secret) throw new Error("PAYSTACK_NOT_CONFIGURED");
  const response = await fetch("https://api.paystack.co" + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const payload = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error((payload as { message?: string }).message || "PAYSTACK_REQUEST_FAILED");
  return payload;
}

export async function getBookingPaymentSummary(
  bookingId: string,
  userId: string,
  role: "couple" | "vendor" | "admin",
): Promise<BookingPaymentSummary | null> {
  await ensureDatabaseSchema();
  const sql = getSql();
  await expireStalePaymentAttempts();

  const bookingRows = await sql`
    SELECT id,total,currency_code,customer_clerk_user_id,vendor_owner_clerk_user_id
    FROM bookings
    WHERE id=${bookingId}
      AND (
        (${role}='couple' AND customer_clerk_user_id=${userId})
        OR
        (${role}<>'couple' AND vendor_owner_clerk_user_id=${userId})
      )
    LIMIT 1
  `;
  const booking = bookingRows[0];
  if (!booking) return null;

  const paymentRows = await sql`
    SELECT * FROM payment_orders
    WHERE booking_id=${bookingId}
    ORDER BY created_at DESC
  `;
  const payments = paymentRows.map((row) => mapPayment(row as Record<string, unknown>));
  const total = money(booking.total);
  const paid = payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = Math.max(0, total - paid);

  let paymentStatus: BookingPaymentSummary["paymentStatus"] = "unpaid";
  if (paid >= total && total > 0) paymentStatus = "paid";
  else if (paid > 0) paymentStatus = "partially_paid";
  else if (payments.some((payment) => payment.status === "refunded")) paymentStatus = "refunded";

  const latestPaid = payments.find((payment) => payment.status === "paid");
  const vendorPayoutRows = await sql`
    SELECT status,recipient_code
    FROM vendor_payout_profiles
    WHERE vendor_owner_clerk_user_id=${String(booking.vendor_owner_clerk_user_id)}
    LIMIT 1
  `;
  const vendorPayoutReady =
    String(vendorPayoutRows[0]?.status ?? "") === "verified" &&
    Boolean(vendorPayoutRows[0]?.recipient_code);

  const releaseRows = await sql`
    SELECT pr.status,pr.provider_transfer_reference
    FROM payout_releases pr
    JOIN payment_orders p ON p.id=pr.payment_order_id
    WHERE p.booking_id=${bookingId}
    ORDER BY pr.created_at DESC
    LIMIT 1
  `;
  const latestReleaseStatus = releaseRows[0]?.status ? String(releaseRows[0].status) : "";

  const caseRows = await sql`
    SELECT case_type,status,reason
    FROM payment_cases
    WHERE booking_id=${bookingId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const latestCase = caseRows[0];
  let caseStatus: PaymentCaseStatus = "none";
  if (latestCase?.case_type === "dispute" && latestCase.status === "open") caseStatus = "dispute_open";
  else if (latestCase?.case_type === "refund" && ["open","processing"].includes(String(latestCase.status))) caseStatus = "refund_processing";
  else if (latestCase?.case_type === "refund" && latestCase.status === "needs_attention") caseStatus = "refund_needs_attention";
  else if (latestCase?.case_type === "refund" && latestCase.status === "processed") caseStatus = "refund_processed";
  else if (latestCase?.case_type === "refund" && latestCase.status === "failed") caseStatus = "refund_failed";

  let releaseStatus: PayoutReleaseStatus = "not_ready";
  if (latestPaid?.fundsStatus === "released" || latestReleaseStatus === "paid") releaseStatus = "released";
  else if (latestReleaseStatus === "processing") releaseStatus = "processing";
  else if (latestReleaseStatus === "queued") releaseStatus = "queued";
  else if (latestReleaseStatus === "failed" || latestReleaseStatus === "cancelled") releaseStatus = "failed";
  else if (
    latestPaid &&
    ["held", "releasable"].includes(latestPaid.fundsStatus) &&
    vendorPayoutReady
  ) releaseStatus = "ready";

  return {
    bookingId,
    total,
    paid,
    outstanding,
    currencyCode: "NGN",
    providerConfigured: isPaystackConfigured(),
    paymentStatus,
    fundsStatus: latestPaid?.fundsStatus ?? "not_started",
    releaseStatus,
    vendorPayoutReady,
    payoutMode: paystackMode(),
    releaseEnabled: isPayoutReleaseEnabled(),
    simulationEnabled: isPayoutSimulationEnabled(),
    caseStatus,
    caseReason: latestCase?.reason ? String(latestCase.reason) : null,
    payments,
  };
}

export async function initializeBookingPayment(
  bookingId: string,
  customerUserId: string,
  callbackOrigin: string,
) {
  await ensureDatabaseSchema();
  const sql = getSql();

  const rows = await sql`
    SELECT b.*,u.email AS customer_email
    FROM bookings b
    JOIN smitten_users u ON u.clerk_user_id=b.customer_clerk_user_id
    WHERE b.id=${bookingId}
      AND b.customer_clerk_user_id=${customerUserId}
      AND b.status='confirmed'
    LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) throw new Error("BOOKING_NOT_FOUND");

  const paidRows = await sql`
    SELECT COALESCE(SUM(amount),0) AS paid
    FROM payment_orders
    WHERE booking_id=${bookingId} AND status='paid'
  `;
  const outstanding = Math.max(0, money(booking.total) - money(paidRows[0]?.paid));
  if (outstanding <= 0) throw new Error("BOOKING_ALREADY_PAID");
  if (!isPaystackConfigured()) throw new Error("PAYSTACK_NOT_CONFIGURED");

  const id = crypto.randomUUID();
  const reference = "smitten_" + crypto.randomUUID().replace(/-/g, "");
  const now = new Date();

  await sql`
    INSERT INTO payment_orders (
      id,booking_id,customer_clerk_user_id,vendor_owner_clerk_user_id,provider,
      provider_reference,purpose,amount,currency_code,status,funds_status,created_at,updated_at
    ) VALUES (
      ${id},${bookingId},${customerUserId},${String(booking.vendor_owner_clerk_user_id)},'paystack',
      ${reference},'full',${outstanding},'NGN','created','not_received',${now},${now}
    )
  `;

  try {
    const callbackUrl = new URL("/api/payments/paystack/callback", callbackOrigin);
    const response = await paystackRequest<PaystackInitializeResponse>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: String(booking.customer_email),
        amount: Math.round(outstanding * 100),
        currency: "NGN",
        reference,
        callback_url: callbackUrl.toString(),
        metadata: {
          smitten_booking_id: bookingId,
          smitten_payment_order_id: id,
        },
      }),
    });

    if (!response.status || !response.data?.authorization_url || !response.data.access_code) {
      throw new Error(response.message || "PAYSTACK_INITIALIZE_FAILED");
    }

    await sql`
      UPDATE payment_orders
      SET status='pending',
          provider_access_code=${response.data.access_code},
          authorization_url=${response.data.authorization_url},
          updated_at=now()
      WHERE id=${id}
    `;
    await sql`
      INSERT INTO payment_events(id,payment_order_id,event_type,payload)
      VALUES(${crypto.randomUUID()},${id},'payment.initialized',${JSON.stringify({ reference, amount: outstanding })}::jsonb)
    `;

    return {
      paymentId: id,
      reference,
      authorizationUrl: response.data.authorization_url,
      amount: outstanding,
    };
  } catch (error) {
    await sql`UPDATE payment_orders SET status='failed',updated_at=now() WHERE id=${id}`;
    throw error;
  }
}

export async function reconcilePaystackPayment(reference: string) {
  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM payment_orders WHERE provider_reference=${reference} LIMIT 1`;
  const order = rows[0];
  if (!order) throw new Error("PAYMENT_NOT_FOUND");

  if (String(order.status) === "paid") {
    return { payment: mapPayment(order as Record<string, unknown>), bookingId: String(order.booking_id) };
  }

  const response = await paystackRequest<PaystackVerifyResponse>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
  const data = response.data;
  if (!response.status || !data) throw new Error("PAYSTACK_VERIFY_FAILED");

  const expectedKobo = Math.round(money(order.amount) * 100);
  if (data.reference !== reference || String(data.currency).toUpperCase() !== "NGN" || Number(data.amount) !== expectedKobo) {
    throw new Error("PAYMENT_MISMATCH");
  }

  if (data.status === "success") {
    const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
    await sql`
      UPDATE payment_orders
      SET status='paid',funds_status='held',provider_paid_at=${paidAt},updated_at=now()
      WHERE id=${String(order.id)} AND status<>'paid'
    `;
    await sql`
      INSERT INTO payment_events(id,payment_order_id,event_type,payload)
      VALUES(${crypto.randomUUID()},${String(order.id)},'payment.paid',${JSON.stringify({ reference, amount: data.amount, currency: data.currency, status: data.status })}::jsonb)
    `;
  } else if (["failed","abandoned","reversed"].includes(data.status)) {
    await sql`UPDATE payment_orders SET status='failed',updated_at=now() WHERE id=${String(order.id)} AND status<>'paid'`;
  }

  const refreshed = await sql`SELECT * FROM payment_orders WHERE id=${String(order.id)} LIMIT 1`;
  return {
    payment: mapPayment(refreshed[0] as Record<string, unknown>),
    bookingId: String(order.booking_id),
  };
}

export function validatePaystackWebhook(rawBody: string, signature: string | null) {
  const secret = paystackSecret();
  if (!secret || !signature) return false;
  const digest = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}



async function markPaymentReleased(paymentOrderId: string, releasedAt = new Date()) {
  const sql = getSql();
  await sql`
    UPDATE payment_orders
    SET funds_status='released',updated_at=now()
    WHERE id=${paymentOrderId} AND status='paid'
  `;
  await sql`
    UPDATE payout_releases
    SET status='paid',released_at=${releasedAt},updated_at=now()
    WHERE payment_order_id=${paymentOrderId}
  `;
}

export async function releaseBookingPayment(bookingId: string, customerUserId: string) {
  await ensureDatabaseSchema();
  if (!isPaystackConfigured()) throw new Error("PAYSTACK_NOT_CONFIGURED");
  if (!isPayoutReleaseEnabled()) throw new Error("LIVE_PAYOUTS_DISABLED");

  const sql = getSql();
  const bookingRows = await sql`
    SELECT id,vendor_owner_clerk_user_id,customer_clerk_user_id,service_summary
    FROM bookings
    WHERE id=${bookingId}
      AND customer_clerk_user_id=${customerUserId}
    LIMIT 1
  `;
  const booking = bookingRows[0];
  if (!booking) throw new Error("BOOKING_NOT_FOUND");

  const payoutRows = await sql`
    SELECT recipient_code,status
    FROM vendor_payout_profiles
    WHERE vendor_owner_clerk_user_id=${String(booking.vendor_owner_clerk_user_id)}
    LIMIT 1
  `;
  const payoutProfile = payoutRows[0];
  if (!payoutProfile || String(payoutProfile.status) !== "verified" || !payoutProfile.recipient_code) {
    throw new Error("PAYOUT_ACCOUNT_REQUIRED");
  }

  const disputedRows = await sql`
    SELECT id FROM payment_orders
    WHERE booking_id=${bookingId} AND status='paid' AND funds_status='disputed'
    LIMIT 1
  `;
  if (disputedRows[0]) throw new Error("PAYOUT_DISPUTED");

  const paymentRows = await sql`
    SELECT *
    FROM payment_orders
    WHERE booking_id=${bookingId}
      AND status='paid'
      AND funds_status IN ('held','releasable')
    ORDER BY provider_paid_at ASC NULLS LAST, created_at ASC
  `;
  if (paymentRows.length === 0) {
    const releasedRows = await sql`
      SELECT id FROM payment_orders
      WHERE booking_id=${bookingId} AND status='paid' AND funds_status='released'
      LIMIT 1
    `;
    if (releasedRows[0]) throw new Error("PAYOUT_ALREADY_RELEASED");
    throw new Error("PAYMENT_NOT_READY_FOR_RELEASE");
  }

  const results: Array<{ paymentOrderId: string; status: string; reference: string }> = [];

  for (const paymentRow of paymentRows) {
    const paymentOrderId = String(paymentRow.id);
    const existingRows = await sql`
      SELECT * FROM payout_releases
      WHERE payment_order_id=${paymentOrderId}
      LIMIT 1
    `;
    const existing = existingRows[0];

    if (existing && ["paid","processing","queued"].includes(String(existing.status))) {
      results.push({
        paymentOrderId,
        status: String(existing.status),
        reference: String(existing.provider_transfer_reference ?? ""),
      });
      continue;
    }

    const releaseId = existing ? String(existing.id) : crypto.randomUUID();
    const simulatePayout = isPayoutSimulationEnabled();
    const existingReference = existing?.provider_transfer_reference
      ? String(existing.provider_transfer_reference)
      : "";
    const transferReference = simulatePayout
      ? "smitten_sim_" + crypto.randomUUID().replace(/-/g, "")
      : existingReference || ("smitten_rel_" + crypto.randomUUID().replace(/-/g, ""));
    const amount = money(paymentRow.amount);

    if (existing) {
      await sql`
        UPDATE payout_releases
        SET status='queued',
            amount=${amount},
            provider_transfer_reference=${transferReference},
            provider_transfer_code=NULL,
            released_at=NULL,
            updated_at=now()
        WHERE id=${releaseId}
      `;
    } else {
      await sql`
        INSERT INTO payout_releases(
          id,payment_order_id,vendor_owner_clerk_user_id,amount,currency_code,status,provider_transfer_reference,created_at,updated_at
        ) VALUES(
          ${releaseId},${paymentOrderId},${String(booking.vendor_owner_clerk_user_id)},${amount},'NGN','queued',${transferReference},now(),now()
        )
      `;
    }

    await sql`
      UPDATE payment_orders
      SET funds_status='releasable',updated_at=now()
      WHERE id=${paymentOrderId} AND status='paid' AND funds_status='held'
    `;

    if (simulatePayout) {
      const releasedAt = new Date();

      await sql`
        UPDATE payout_releases
        SET status='paid',
            provider_transfer_reference=${transferReference},
            provider_transfer_code=NULL,
            released_at=${releasedAt},
            updated_at=now()
        WHERE id=${releaseId}
      `;

      await sql`
        INSERT INTO payment_events(id,payment_order_id,event_type,payload)
        VALUES(
          ${crypto.randomUUID()},
          ${paymentOrderId},
          'payout.simulated',
          ${JSON.stringify({
            reference: transferReference,
            mode: "test",
            simulated: true,
            amount,
            currency: "NGN",
          })}::jsonb
        )
      `;

      await markPaymentReleased(paymentOrderId, releasedAt);
      results.push({ paymentOrderId, status: "simulated", reference: transferReference });
      continue;
    }

    let response: PaystackTransferResponse;
    try {
      response = await paystackRequest<PaystackTransferResponse>("/transfer", {
        method: "POST",
        body: JSON.stringify({
          source: "balance",
          amount: Math.round(amount * 100),
          recipient: String(payoutProfile.recipient_code),
          reference: transferReference,
          reason: `Smitten payout for ${String(booking.service_summary)}`,
          currency: "NGN",
        }),
      });
    } catch (error) {
      await sql`
        UPDATE payout_releases
        SET status='failed',updated_at=now()
        WHERE id=${releaseId}
      `;
      throw error;
    }

    const data = response.data;
    if (
      !response.status ||
      !data ||
      data.reference !== transferReference ||
      Number(data.amount) !== Math.round(amount * 100) ||
      String(data.currency).toUpperCase() !== "NGN"
    ) {
      await sql`
        UPDATE payout_releases
        SET status='failed',updated_at=now()
        WHERE id=${releaseId}
      `;
      throw new Error("PAYOUT_TRANSFER_MISMATCH");
    }

    const transferStatus = String(data.status || "").toLowerCase();
    const transferCode = data.transfer_code ? String(data.transfer_code) : null;

    await sql`
      UPDATE payout_releases
      SET status=${transferStatus === "success" ? "paid" : "processing"},
          provider_transfer_code=${transferCode},
          released_at=${transferStatus === "success" ? new Date(data.transferred_at || Date.now()) : null},
          updated_at=now()
      WHERE id=${releaseId}
    `;

    await sql`
      INSERT INTO payment_events(id,payment_order_id,event_type,payload)
      VALUES(
        ${crypto.randomUUID()},
        ${paymentOrderId},
        'payout.initiated',
        ${JSON.stringify({
          reference: transferReference,
          transferCode,
          status: transferStatus,
          amount: data.amount,
          currency: data.currency,
        })}::jsonb
      )
    `;

    if (transferStatus === "success") {
      await markPaymentReleased(paymentOrderId, new Date(data.transferred_at || Date.now()));
    }

    results.push({ paymentOrderId, status: transferStatus, reference: transferReference });

    if (transferStatus === "otp") {
      throw new Error("PAYOUT_OTP_REQUIRED");
    }
  }

  return { bookingId, releases: results };
}

export async function reconcilePaystackTransferEvent(
  eventType: "transfer.success" | "transfer.failed" | "transfer.reversed",
  data: {
    reference?: string;
    amount?: number;
    currency?: string;
    transfer_code?: string | null;
    transferred_at?: string | null;
  },
) {
  await ensureDatabaseSchema();
  const reference = data.reference?.trim();
  if (!reference) throw new Error("TRANSFER_REFERENCE_MISSING");

  const sql = getSql();
  const releaseRows = await sql`
    SELECT pr.*,p.amount AS payment_amount,p.status AS payment_status
    FROM payout_releases pr
    JOIN payment_orders p ON p.id=pr.payment_order_id
    WHERE pr.provider_transfer_reference=${reference}
    LIMIT 1
  `;
  const release = releaseRows[0];
  if (!release) throw new Error("PAYOUT_RELEASE_NOT_FOUND");

  if (data.currency && String(data.currency).toUpperCase() !== "NGN") {
    throw new Error("PAYOUT_TRANSFER_MISMATCH");
  }
  if (typeof data.amount === "number" && Number(data.amount) !== Math.round(money(release.amount) * 100)) {
    throw new Error("PAYOUT_TRANSFER_MISMATCH");
  }

  const paymentOrderId = String(release.payment_order_id);
  const previousStatus = String(release.status);

  if (eventType === "transfer.success") {
    if (previousStatus !== "paid") {
      await markPaymentReleased(
        paymentOrderId,
        data.transferred_at ? new Date(data.transferred_at) : new Date(),
      );
    }
  } else {
    await sql`
      UPDATE payout_releases
      SET status='failed',
          provider_transfer_code=COALESCE(${data.transfer_code ?? null},provider_transfer_code),
          updated_at=now()
      WHERE id=${String(release.id)}
    `;
    await sql`
      UPDATE payment_orders
      SET funds_status='releasable',updated_at=now()
      WHERE id=${paymentOrderId} AND status='paid'
    `;
  }

  if (
    previousStatus !== (eventType === "transfer.success" ? "paid" : "failed") ||
    eventType === "transfer.reversed"
  ) {
    await sql`
      INSERT INTO payment_events(id,payment_order_id,event_type,payload)
      VALUES(
        ${crypto.randomUUID()},
        ${paymentOrderId},
        ${eventType === "transfer.success" ? "payout.released" : eventType === "transfer.reversed" ? "payout.reversed" : "payout.failed"},
        ${JSON.stringify(data)}::jsonb
      )
    `;
  }

  return { paymentOrderId, reference, eventType };
}



export async function openPaymentDispute(bookingId: string, customerUserId: string, reason: string) {
  await ensureDatabaseSchema();
  const sql = getSql();
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 10) throw new Error("DISPUTE_REASON_REQUIRED");

  const rows = await sql`
    SELECT p.*
    FROM payment_orders p
    JOIN bookings b ON b.id=p.booking_id
    WHERE p.booking_id=${bookingId}
      AND b.customer_clerk_user_id=${customerUserId}
      AND p.status='paid'
    ORDER BY p.provider_paid_at DESC NULLS LAST,p.created_at DESC
    LIMIT 1
  `;
  const payment = rows[0];
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (String(payment.funds_status) === "released") throw new Error("PAYOUT_ALREADY_RELEASED");
  if (String(payment.funds_status) === "refunded") throw new Error("PAYMENT_ALREADY_REFUNDED");

  const releaseRows = await sql`
    SELECT status FROM payout_releases
    WHERE payment_order_id=${String(payment.id)}
      AND status IN ('queued','processing','paid')
    LIMIT 1
  `;
  if (releaseRows[0]) throw new Error("PAYOUT_ALREADY_STARTED");

  const existing = await sql`
    SELECT id FROM payment_cases
    WHERE payment_order_id=${String(payment.id)}
      AND case_type='dispute'
      AND status='open'
    LIMIT 1
  `;
  if (existing[0]) throw new Error("DISPUTE_ALREADY_OPEN");

  const caseId = crypto.randomUUID();
  await sql`
    INSERT INTO payment_cases(
      id,payment_order_id,booking_id,case_type,status,opened_by_clerk_user_id,reason,created_at,updated_at
    ) VALUES(
      ${caseId},${String(payment.id)},${bookingId},'dispute','open',${customerUserId},${normalizedReason},now(),now()
    )
  `;
  await sql`
    UPDATE payment_orders
    SET funds_status='disputed',updated_at=now()
    WHERE id=${String(payment.id)} AND status='paid'
  `;
  await sql`
    INSERT INTO payment_events(id,payment_order_id,event_type,payload)
    VALUES(
      ${crypto.randomUUID()},
      ${String(payment.id)},
      'dispute.opened',
      ${JSON.stringify({ caseId, reason: normalizedReason })}::jsonb
    )
  `;

  return { caseId, bookingId };
}

export type AdminFinancePaymentView = AccountPaymentView & {
  caseId: string | null;
  caseType: "dispute" | "refund" | null;
  caseStatus: string | null;
  caseReason: string | null;
};

export async function listAdminFinancePayments(): Promise<AdminFinancePaymentView[]> {
  await ensureDatabaseSchema();
  await expireStalePaymentAttempts();
  const rows = await getSql()`
    SELECT
      p.*,
      b.service_summary,
      b.wedding_date,
      b.wedding_location,
      mv.business_name AS vendor_name,
      COALESCE(e.contact_name,customer.full_name) AS customer_name,
      pc.id AS case_id,
      pc.case_type,
      pc.status AS case_status,
      pc.reason AS case_reason
    FROM payment_orders p
    JOIN bookings b ON b.id=p.booking_id
    JOIN marketplace_vendors mv ON mv.id=b.vendor_id
    JOIN enquiries e ON e.id=b.enquiry_id
    JOIN smitten_users customer ON customer.clerk_user_id=b.customer_clerk_user_id
    LEFT JOIN LATERAL (
      SELECT id,case_type,status,reason
      FROM payment_cases
      WHERE payment_order_id=p.id
      ORDER BY created_at DESC
      LIMIT 1
    ) pc ON true
    WHERE p.status<>'cancelled'
    ORDER BY
      CASE WHEN pc.status IN ('open','processing','needs_attention') THEN 0 ELSE 1 END,
      p.created_at DESC
    LIMIT 200
  `;

  return rows.map((row) => ({
    ...mapPayment(row as Record<string, unknown>),
    vendorName: String(row.vendor_name),
    customerName: String(row.customer_name),
    serviceSummary: String(row.service_summary),
    weddingDate: row.wedding_date ? String(row.wedding_date).slice(0,10) : null,
    weddingLocation: String(row.wedding_location),
    caseId: row.case_id ? String(row.case_id) : null,
    caseType: row.case_type ? String(row.case_type) as "dispute" | "refund" : null,
    caseStatus: row.case_status ? String(row.case_status) : null,
    caseReason: row.case_reason ? String(row.case_reason) : null,
  }));
}

export async function resolvePaymentDispute(paymentOrderId: string, adminUserId: string) {
  await ensureDatabaseSchema();
  const sql = getSql();

  const caseRows = await sql`
    SELECT * FROM payment_cases
    WHERE payment_order_id=${paymentOrderId}
      AND case_type='dispute'
      AND status='open'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const activeCase = caseRows[0];
  if (!activeCase) throw new Error("DISPUTE_NOT_FOUND");

  const paymentRows = await sql`SELECT * FROM payment_orders WHERE id=${paymentOrderId} LIMIT 1`;
  const payment = paymentRows[0];
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (String(payment.funds_status) === "released") throw new Error("PAYOUT_ALREADY_RELEASED");

  await sql`
    UPDATE payment_cases
    SET status='resolved',resolved_by_clerk_user_id=${adminUserId},resolved_at=now(),updated_at=now()
    WHERE id=${String(activeCase.id)}
  `;
  await sql`
    UPDATE payment_orders
    SET funds_status='held',updated_at=now()
    WHERE id=${paymentOrderId} AND status='paid' AND funds_status='disputed'
  `;
  await sql`
    INSERT INTO payment_events(id,payment_order_id,event_type,payload)
    VALUES(${crypto.randomUUID()},${paymentOrderId},'dispute.resolved',${JSON.stringify({ caseId: String(activeCase.id), adminUserId })}::jsonb)
  `;

  return { paymentOrderId, caseId: String(activeCase.id) };
}

export async function initiatePaymentRefund(paymentOrderId: string, adminUserId: string, reason: string) {
  await ensureDatabaseSchema();
  if (!isPaystackConfigured()) throw new Error("PAYSTACK_NOT_CONFIGURED");
  if (!isRefundEnabled()) throw new Error("LIVE_REFUNDS_DISABLED");

  const sql = getSql();
  const paymentRows = await sql`SELECT * FROM payment_orders WHERE id=${paymentOrderId} LIMIT 1`;
  const payment = paymentRows[0];
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (String(payment.status) !== "paid") throw new Error("PAYMENT_NOT_REFUNDABLE");
  if (String(payment.funds_status) === "released") throw new Error("PAYOUT_ALREADY_RELEASED");
  if (String(payment.funds_status) === "refunded") throw new Error("PAYMENT_ALREADY_REFUNDED");

  const releaseRows = await sql`
    SELECT status FROM payout_releases
    WHERE payment_order_id=${paymentOrderId}
      AND status IN ('queued','processing','paid')
    LIMIT 1
  `;
  if (releaseRows[0]) throw new Error("PAYOUT_ALREADY_STARTED");

  const activeRefund = await sql`
    SELECT id,status FROM payment_cases
    WHERE payment_order_id=${paymentOrderId}
      AND case_type='refund'
      AND status IN ('open','processing','needs_attention')
    LIMIT 1
  `;
  if (activeRefund[0]) throw new Error("REFUND_ALREADY_IN_PROGRESS");

  const caseId = crypto.randomUUID();
  const normalizedReason = reason.trim() || "Refund approved by Smitten support";
  await sql`
    INSERT INTO payment_cases(
      id,payment_order_id,booking_id,case_type,status,opened_by_clerk_user_id,reason,amount,created_at,updated_at
    ) VALUES(
      ${caseId},${paymentOrderId},${String(payment.booking_id)},'refund','processing',${adminUserId},${normalizedReason},${money(payment.amount)},now(),now()
    )
  `;
  await sql`UPDATE payment_orders SET funds_status='disputed',updated_at=now() WHERE id=${paymentOrderId}`;

  let response: PaystackRefundResponse;
  try {
    response = await paystackRequest<PaystackRefundResponse>("/refund", {
      method: "POST",
      body: JSON.stringify({
        transaction: String(payment.provider_reference),
        amount: Math.round(money(payment.amount) * 100),
        currency: "NGN",
        customer_note: "Refund from Smitten",
        merchant_note: normalizedReason,
      }),
    });
  } catch (error) {
    await sql`UPDATE payment_cases SET status='failed',updated_at=now() WHERE id=${caseId}`;
    await sql`UPDATE payment_orders SET funds_status='held',updated_at=now() WHERE id=${paymentOrderId} AND status='paid'`;
    throw error;
  }

  const refundStatus = String(response.data?.status ?? "processing").toLowerCase();
  const refundRef = response.data?.refund_reference
    ? String(response.data.refund_reference)
    : response.data?.id
      ? String(response.data.id)
      : null;

  await sql`
    UPDATE payment_cases
    SET status=${refundStatus === "processed" ? "processed" : refundStatus === "failed" ? "failed" : refundStatus === "needs-attention" ? "needs_attention" : "processing"},
        provider_reference=${refundRef},
        updated_at=now()
    WHERE id=${caseId}
  `;

  if (refundStatus === "processed") {
    await sql`
      UPDATE payment_orders
      SET status='refunded',funds_status='refunded',updated_at=now()
      WHERE id=${paymentOrderId}
    `;
  }

  await sql`
    INSERT INTO payment_events(id,payment_order_id,event_type,payload)
    VALUES(
      ${crypto.randomUUID()},
      ${paymentOrderId},
      'refund.initiated',
      ${JSON.stringify({ caseId, status: refundStatus, refundReference: refundRef, reason: normalizedReason })}::jsonb
    )
  `;

  return { paymentOrderId, caseId, status: refundStatus };
}

export async function reconcilePaystackRefundEvent(
  eventType: "refund.pending" | "refund.processing" | "refund.needs-attention" | "refund.failed" | "refund.processed",
  data: {
    transaction_reference?: string;
    refund_reference?: string | null;
    id?: number;
    amount?: string | number;
    currency?: string;
    status?: string;
  },
) {
  await ensureDatabaseSchema();
  const transactionReference = data.transaction_reference?.trim();
  if (!transactionReference) throw new Error("REFUND_TRANSACTION_REFERENCE_MISSING");

  const sql = getSql();
  const paymentRows = await sql`
    SELECT * FROM payment_orders
    WHERE provider_reference=${transactionReference}
    LIMIT 1
  `;
  const payment = paymentRows[0];
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");

  const caseRows = await sql`
    SELECT * FROM payment_cases
    WHERE payment_order_id=${String(payment.id)}
      AND case_type='refund'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const refundCase = caseRows[0];
  if (!refundCase) throw new Error("REFUND_CASE_NOT_FOUND");

  const nextStatus =
    eventType === "refund.processed" ? "processed" :
    eventType === "refund.failed" ? "failed" :
    eventType === "refund.needs-attention" ? "needs_attention" :
    "processing";

  await sql`
    UPDATE payment_cases
    SET status=${nextStatus},
        provider_reference=COALESCE(${data.refund_reference ?? (data.id ? String(data.id) : null)},provider_reference),
        updated_at=now(),
        resolved_at=${nextStatus === "processed" || nextStatus === "failed" ? new Date() : null}
    WHERE id=${String(refundCase.id)}
  `;

  if (nextStatus === "processed") {
    await sql`
      UPDATE payment_orders
      SET status='refunded',funds_status='refunded',updated_at=now()
      WHERE id=${String(payment.id)}
    `;
  } else if (nextStatus === "failed") {
    await sql`
      UPDATE payment_orders
      SET funds_status='held',updated_at=now()
      WHERE id=${String(payment.id)} AND status='paid'
    `;
  } else {
    await sql`
      UPDATE payment_orders
      SET funds_status='disputed',updated_at=now()
      WHERE id=${String(payment.id)} AND status='paid'
    `;
  }

  await sql`
    INSERT INTO payment_events(id,payment_order_id,event_type,payload)
    VALUES(
      ${crypto.randomUUID()},
      ${String(payment.id)},
      ${eventType},
      ${JSON.stringify(data)}::jsonb
    )
  `;

  return { paymentOrderId: String(payment.id), status: nextStatus };
}


export async function listAccountPayments(
  userId: string,
  role: "couple" | "vendor" | "admin",
): Promise<AccountPaymentView[]> {
  await ensureDatabaseSchema();
  await expireStalePaymentAttempts();
  const rows = await getSql()`
    SELECT
      p.*,
      b.service_summary,
      b.wedding_date,
      b.wedding_location,
      mv.business_name AS vendor_name,
      COALESCE(e.contact_name, customer.full_name) AS customer_name
    FROM payment_orders p
    JOIN bookings b ON b.id=p.booking_id
    JOIN marketplace_vendors mv ON mv.id=b.vendor_id
    JOIN enquiries e ON e.id=b.enquiry_id
    JOIN smitten_users customer ON customer.clerk_user_id=b.customer_clerk_user_id
    WHERE p.status<>'cancelled'
      AND (
        (${role}='couple' AND p.customer_clerk_user_id=${userId})
        OR
        (${role}<>'couple' AND p.vendor_owner_clerk_user_id=${userId})
      )
    ORDER BY p.created_at DESC
  `;

  return rows.map((row) => ({
    ...mapPayment(row as Record<string, unknown>),
    vendorName: String(row.vendor_name),
    customerName: String(row.customer_name),
    serviceSummary: String(row.service_summary),
    weddingDate: row.wedding_date ? String(row.wedding_date).slice(0, 10) : null,
    weddingLocation: String(row.wedding_location),
  }));
}


export async function listPaystackBanks(): Promise<PaystackBank[]> {
  if (!isPaystackConfigured()) throw new Error("PAYSTACK_NOT_CONFIGURED");
  const response = await paystackRequest<{
    status: boolean;
    data?: Array<{ name?: string; code?: string; active?: boolean; currency?: string; country?: string }>;
  }>("/bank?country=nigeria&currency=NGN&perPage=100", { method: "GET" });

  return (response.data ?? [])
    .filter((bank) => bank.active !== false && bank.name && bank.code)
    .map((bank) => ({ name: String(bank.name), code: String(bank.code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getVendorPayoutProfile(vendorUserId: string): Promise<VendorPayoutProfileView> {
  await ensureDatabaseSchema();
  const rows = await getSql()`
    SELECT provider,recipient_code,account_name,bank_name,account_last4,status
    FROM vendor_payout_profiles
    WHERE vendor_owner_clerk_user_id=${vendorUserId}
    LIMIT 1
  `;
  const row = rows[0];
  return {
    provider: "paystack",
    recipientCode: row?.recipient_code ? String(row.recipient_code) : null,
    accountName: row?.account_name ? String(row.account_name) : null,
    bankName: row?.bank_name ? String(row.bank_name) : null,
    accountLast4: row?.account_last4 ? String(row.account_last4) : null,
    status: row ? String(row.status) as VendorPayoutProfileView["status"] : "unconfigured",
    providerConfigured: isPaystackConfigured(),
  };
}

export async function configureVendorPayoutProfile(
  vendorUserId: string,
  input: { bankCode: string; bankName: string; accountNumber: string },
) {
  await ensureDatabaseSchema();
  if (!isPaystackConfigured()) throw new Error("PAYSTACK_NOT_CONFIGURED");

  const accountNumber = input.accountNumber.replace(/\s+/g, "");
  if (!/^\d{10}$/.test(accountNumber)) throw new Error("INVALID_ACCOUNT_NUMBER");

  const sql = getSql();
  const currentProfileRows = await sql`
    SELECT recipient_code
    FROM vendor_payout_profiles
    WHERE vendor_owner_clerk_user_id=${vendorUserId}
    LIMIT 1
  `;
  const previousRecipientCode = currentProfileRows[0]?.recipient_code
    ? String(currentProfileRows[0].recipient_code)
    : null;

  const vendorRows = await sql`
    SELECT business_name,contact_name
    FROM vendor_profiles
    WHERE clerk_user_id=${vendorUserId}
    LIMIT 1
  `;
  const vendor = vendorRows[0];
  if (!vendor) throw new Error("VENDOR_PROFILE_NOT_FOUND");

  const resolved = await paystackRequest<{
    status: boolean;
    data?: { account_number?: string; account_name?: string };
  }>(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(input.bankCode)}`, { method: "GET" });

  const accountName = resolved.data?.account_name?.trim();
  if (!accountName) throw new Error("ACCOUNT_RESOLUTION_FAILED");

  const recipient = await paystackRequest<{
    status: boolean;
    data?: { recipient_code?: string; active?: boolean };
  }>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      name: accountName,
      account_number: accountNumber,
      bank_code: input.bankCode,
      currency: "NGN",
      description: `Smitten payout account for ${String(vendor.business_name)}`,
      metadata: { smitten_vendor_user_id: vendorUserId },
    }),
  });

  const recipientCode = recipient.data?.recipient_code;
  if (!recipientCode) throw new Error("RECIPIENT_CREATION_FAILED");

  await sql`
    INSERT INTO vendor_payout_profiles(
      vendor_owner_clerk_user_id,provider,recipient_code,account_name,bank_name,account_last4,status,created_at,updated_at
    ) VALUES(
      ${vendorUserId},'paystack',${recipientCode},${accountName},${input.bankName},${accountNumber.slice(-4)},'verified',now(),now()
    )
    ON CONFLICT (vendor_owner_clerk_user_id) DO UPDATE SET
      provider='paystack',
      recipient_code=EXCLUDED.recipient_code,
      account_name=EXCLUDED.account_name,
      bank_name=EXCLUDED.bank_name,
      account_last4=EXCLUDED.account_last4,
      status='verified',
      updated_at=now()
  `;

  if (previousRecipientCode && previousRecipientCode !== recipientCode) {
    try {
      await paystackRequest<{ status: boolean; message?: string }>(
        `/transferrecipient/${encodeURIComponent(previousRecipientCode)}`,
        { method: "DELETE" },
      );
    } catch (error) {
      console.warn("Unable to deactivate previous Paystack payout recipient", error);
    }
  }

  return getVendorPayoutProfile(vendorUserId);
}

export async function removeVendorPayoutProfile(vendorUserId: string) {
  await ensureDatabaseSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT recipient_code
    FROM vendor_payout_profiles
    WHERE vendor_owner_clerk_user_id=${vendorUserId}
    LIMIT 1
  `;
  const recipientCode = rows[0]?.recipient_code ? String(rows[0].recipient_code) : null;

  if (!rows[0]) return getVendorPayoutProfile(vendorUserId);
  if (recipientCode) {
    if (!isPaystackConfigured()) throw new Error("PAYSTACK_NOT_CONFIGURED");
    await paystackRequest<{ status: boolean; message?: string }>(
      `/transferrecipient/${encodeURIComponent(recipientCode)}`,
      { method: "DELETE" },
    );
  }

  await sql`
    DELETE FROM vendor_payout_profiles
    WHERE vendor_owner_clerk_user_id=${vendorUserId}
  `;

  return getVendorPayoutProfile(vendorUserId);
}
