import crypto from "node:crypto";
import { ensureDatabaseSchema, getSql } from "@/db";

export type PaymentStatus = "created" | "pending" | "paid" | "failed" | "cancelled" | "refunded";
export type FundsStatus = "not_received" | "held" | "releasable" | "released" | "refunded" | "disputed";

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
  return {
    bookingId,
    total,
    paid,
    outstanding,
    currencyCode: "NGN",
    providerConfigured: isPaystackConfigured(),
    paymentStatus,
    fundsStatus: latestPaid?.fundsStatus ?? "not_started",
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


export async function listAccountPayments(
  userId: string,
  role: "couple" | "vendor" | "admin",
): Promise<AccountPaymentView[]> {
  await ensureDatabaseSchema();
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
    WHERE (
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

  return getVendorPayoutProfile(vendorUserId);
}
