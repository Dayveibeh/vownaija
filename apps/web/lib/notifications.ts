import crypto from "node:crypto";
import { getSql } from "@/db";

export type NotificationView = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

function money(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function publicUrl() {
  const value = process.env.SMITTEN_PUBLIC_URL?.trim();
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.SMITTEN_EMAIL_FROM?.trim());
}

async function sendNotificationEmail(input: {
  notificationId: string;
  email: string;
  fullName: string;
  title: string;
  body: string;
  href?: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SMITTEN_EMAIL_FROM?.trim();
  if (!apiKey || !from) return;

  const base = publicUrl();
  const href = input.href && base
    ? new URL(input.href, base).toString()
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#211e1d">
      <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#857a75">Smitten</p>
      <h1 style="font-size:24px;margin:0 0 14px">${escapeHtml(input.title)}</h1>
      <p style="font-size:15px;line-height:1.6;color:#5f5753">${escapeHtml(input.body)}</p>
      ${href ? `<p style="margin-top:24px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#211e1d;color:#fff;text-decoration:none;font-weight:700">Open in Smitten</a></p>` : ""}
      <p style="margin-top:32px;font-size:12px;color:#958b86">Sent to ${escapeHtml(input.fullName || input.email)} because this activity happened on your Smitten account.</p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        subject: input.title,
        html,
      }),
    });

    const sql = getSql();
    if (response.ok) {
      await sql`
        UPDATE notifications
        SET email_status='sent',email_sent_at=now()
        WHERE id=${input.notificationId}
      `;
      return;
    }

    const payload = await response.text().catch(() => "");
    console.error("Notification email failed", response.status, payload.slice(0, 500));
    await sql`
      UPDATE notifications
      SET email_status='failed'
      WHERE id=${input.notificationId}
    `;
  } catch (error) {
    console.error("Notification email failed", error);
    await getSql()`
      UPDATE notifications
      SET email_status='failed'
      WHERE id=${input.notificationId}
    `;
  }
}

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  uniqueKey: string;
}) {
  const sql = getSql();
  const id = crypto.randomUUID();
  const wantsEmail = emailConfigured();

  const inserted = await sql`
    INSERT INTO notifications(
      id,clerk_user_id,type,title,body,href,unique_key,email_status,created_at
    ) VALUES(
      ${id},${input.userId},${input.type},${input.title},${input.body},
      ${input.href ?? null},${input.uniqueKey},${wantsEmail ? "pending" : "skipped"},now()
    )
    ON CONFLICT (unique_key) DO NOTHING
    RETURNING id
  `;

  if (!inserted[0]) return { created: false, id: null };

  if (wantsEmail) {
    const userRows = await sql`
      SELECT email,full_name
      FROM smitten_users
      WHERE clerk_user_id=${input.userId}
      LIMIT 1
    `;
    const user = userRows[0];
    if (user?.email) {
      await sendNotificationEmail({
        notificationId: id,
        email: String(user.email),
        fullName: String(user.full_name ?? ""),
        title: input.title,
        body: input.body,
        href: input.href,
      });
    } else {
      await sql`UPDATE notifications SET email_status='failed' WHERE id=${id}`;
    }
  }

  return { created: true, id };
}

async function adminIds() {
  const rows = await getSql()`
    SELECT clerk_user_id
    FROM smitten_users
    WHERE role='admin'
  `;
  return rows.map((row) => String(row.clerk_user_id));
}

async function paymentContext(paymentOrderId: string) {
  const rows = await getSql()`
    SELECT
      p.id,
      p.booking_id,
      p.customer_clerk_user_id,
      p.vendor_owner_clerk_user_id,
      p.amount,
      p.purpose,
      b.total,
      b.service_summary,
      b.payment_plan,
      b.deposit_amount,
      mv.business_name AS vendor_name,
      customer.full_name AS customer_name
    FROM payment_orders p
    JOIN bookings b ON b.id=p.booking_id
    JOIN marketplace_vendors mv ON mv.id=b.vendor_id
    JOIN smitten_users customer ON customer.clerk_user_id=b.customer_clerk_user_id
    WHERE p.id=${paymentOrderId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function bookingPaidTotal(bookingId: string) {
  const rows = await getSql()`
    SELECT COALESCE(SUM(amount),0) AS paid
    FROM payment_orders
    WHERE booking_id=${bookingId} AND status='paid'
  `;
  return money(rows[0]?.paid);
}

export async function notifyPaymentPaid(paymentOrderId: string) {
  const context = await paymentContext(paymentOrderId);
  if (!context) return;

  const bookingId = String(context.booking_id);
  const customerId = String(context.customer_clerk_user_id);
  const vendorId = String(context.vendor_owner_clerk_user_id);
  const service = String(context.service_summary);
  const vendorName = String(context.vendor_name);
  const amount = money(context.amount);
  const total = money(context.total);
  const paid = await bookingPaidTotal(bookingId);
  const outstanding = Math.max(0, total - paid);
  const purpose = String(context.purpose);
  const href = `/bookings/${bookingId}`;

  if (purpose === "deposit" && outstanding > 0) {
    await createNotification({
      userId: customerId,
      type: "deposit.paid",
      title: "Deposit paid",
      body: `Your ${formatNaira(amount)} deposit for ${service} with ${vendorName} is confirmed.`,
      href,
      uniqueKey: `payment:${paymentOrderId}:deposit-paid:customer`,
    });
    await createNotification({
      userId: customerId,
      type: "balance.due",
      title: "Balance remaining",
      body: `${formatNaira(outstanding)} remains on this booking. You can pay the balance from the booking when you're ready.`,
      href,
      uniqueKey: `payment:${paymentOrderId}:balance-due:customer`,
    });
    await createNotification({
      userId: vendorId,
      type: "deposit.received",
      title: "Deposit received",
      body: `The customer paid ${formatNaira(amount)} towards ${service}. ${formatNaira(outstanding)} remains before payout can be released.`,
      href,
      uniqueKey: `payment:${paymentOrderId}:deposit-paid:vendor`,
    });
    return;
  }

  if (outstanding <= 0) {
    await createNotification({
      userId: customerId,
      type: "payment.complete",
      title: "Booking fully paid",
      body: `Payment for ${service} with ${vendorName} is complete. Your payment remains protected until you release the vendor payout.`,
      href,
      uniqueKey: `booking:${bookingId}:fully-paid:customer`,
    });
    await createNotification({
      userId: vendorId,
      type: "payment.complete",
      title: "Full payment received",
      body: `The customer has fully paid for ${service}. The payout is now awaiting customer release.`,
      href,
      uniqueKey: `booking:${bookingId}:fully-paid:vendor`,
    });
    await createNotification({
      userId: customerId,
      type: "payout.awaiting_release",
      title: "Vendor payout ready",
      body: `When the service is complete and you're happy, return to the booking to release the protected payout.`,
      href,
      uniqueKey: `booking:${bookingId}:payout-ready:customer`,
    });
    return;
  }

  await createNotification({
    userId: customerId,
    type: "payment.received",
    title: "Payment received",
    body: `Your ${formatNaira(amount)} payment for ${service} is confirmed. ${formatNaira(outstanding)} remains.`,
    href,
    uniqueKey: `payment:${paymentOrderId}:received:customer`,
  });
  await createNotification({
    userId: vendorId,
    type: "payment.received",
    title: "Payment received",
    body: `The customer paid ${formatNaira(amount)} towards ${service}. ${formatNaira(outstanding)} remains.`,
    href,
    uniqueKey: `payment:${paymentOrderId}:received:vendor`,
  });
}

export async function notifyPayoutReleased(paymentOrderId: string, simulated = false) {
  const context = await paymentContext(paymentOrderId);
  if (!context) return;

  const bookingId = String(context.booking_id);
  const customerId = String(context.customer_clerk_user_id);
  const vendorId = String(context.vendor_owner_clerk_user_id);
  const service = String(context.service_summary);
  const total = money(context.total);
  const href = `/bookings/${bookingId}`;

  await createNotification({
    userId: customerId,
    type: "payout.released",
    title: simulated ? "Test payout release complete" : "Vendor payout released",
    body: simulated
      ? `The staging release for ${service} was simulated successfully. No real money moved.`
      : `The vendor payout for ${service} has been released.`,
    href,
    uniqueKey: `booking:${bookingId}:payout-released:customer`,
  });
  await createNotification({
    userId: vendorId,
    type: "payout.released",
    title: simulated ? "Test payout release complete" : "Payout released",
    body: simulated
      ? `Smitten simulated the ${formatNaira(total)} booking payout for ${service}. No real bank transfer was sent.`
      : `Smitten released the ${formatNaira(total)} booking payout for ${service} to your payout account.`,
    href,
    uniqueKey: `booking:${bookingId}:payout-released:vendor`,
  });
}

export async function notifyPayoutProcessing(paymentOrderId: string) {
  const context = await paymentContext(paymentOrderId);
  if (!context) return;
  const bookingId = String(context.booking_id);
  const service = String(context.service_summary);
  const href = `/bookings/${bookingId}`;

  await createNotification({
    userId: String(context.customer_clerk_user_id),
    type: "payout.processing",
    title: "Payout release in progress",
    body: `Paystack is processing the vendor payout for ${service}.`,
    href,
    uniqueKey: `booking:${bookingId}:payout-processing:customer`,
  });
  await createNotification({
    userId: String(context.vendor_owner_clerk_user_id),
    type: "payout.processing",
    title: "Payout processing",
    body: `Your payout for ${service} has been sent for processing.`,
    href,
    uniqueKey: `booking:${bookingId}:payout-processing:vendor`,
  });
}

export async function notifyPayoutFailed(paymentOrderId: string, reversed = false) {
  const context = await paymentContext(paymentOrderId);
  if (!context) return;
  const bookingId = String(context.booking_id);
  const service = String(context.service_summary);
  const href = `/bookings/${bookingId}`;
  const title = reversed ? "Payout reversed" : "Payout needs attention";
  const body = reversed
    ? `The payout for ${service} was reversed by the payment provider. The funds are no longer shown as released.`
    : `The payout for ${service} did not complete. Smitten has kept the payment in a releasable state while this is reviewed.`;

  for (const userId of [String(context.customer_clerk_user_id), String(context.vendor_owner_clerk_user_id)]) {
    await createNotification({
      userId,
      type: reversed ? "payout.reversed" : "payout.failed",
      title,
      body,
      href,
      uniqueKey: `booking:${bookingId}:${reversed ? "payout-reversed" : "payout-failed"}:${userId}`,
    });
  }

  for (const userId of await adminIds()) {
    await createNotification({
      userId,
      type: reversed ? "payout.reversed" : "payout.failed",
      title,
      body,
      href: "/admin/payments",
      uniqueKey: `booking:${bookingId}:${reversed ? "payout-reversed" : "payout-failed"}:admin:${userId}`,
    });
  }
}

export async function notifyDisputeOpened(paymentOrderId: string, reason: string) {
  const context = await paymentContext(paymentOrderId);
  if (!context) return;
  const bookingId = String(context.booking_id);
  const service = String(context.service_summary);
  const href = `/bookings/${bookingId}`;

  await createNotification({
    userId: String(context.customer_clerk_user_id),
    type: "dispute.opened",
    title: "Payment issue reported",
    body: `Your report for ${service} has been recorded. The vendor payout is paused while Smitten reviews it.`,
    href,
    uniqueKey: `payment:${paymentOrderId}:dispute-opened:customer`,
  });
  await createNotification({
    userId: String(context.vendor_owner_clerk_user_id),
    type: "dispute.opened",
    title: "Payout paused",
    body: `The customer reported an issue with ${service}. The payout is paused while Smitten reviews the case.`,
    href,
    uniqueKey: `payment:${paymentOrderId}:dispute-opened:vendor`,
  });

  for (const userId of await adminIds()) {
    await createNotification({
      userId,
      type: "dispute.opened",
      title: "Payment dispute needs review",
      body: `${service}: ${reason.slice(0, 220)}`,
      href: "/admin/payments",
      uniqueKey: `payment:${paymentOrderId}:dispute-opened:admin:${userId}`,
    });
  }
}

export async function notifyDisputeResolved(paymentOrderId: string) {
  const context = await paymentContext(paymentOrderId);
  if (!context) return;
  const bookingId = String(context.booking_id);
  const service = String(context.service_summary);
  const href = `/bookings/${bookingId}`;

  await createNotification({
    userId: String(context.customer_clerk_user_id),
    type: "dispute.resolved",
    title: "Payment dispute resolved",
    body: `Smitten has resolved the payment dispute for ${service}. The payment is protected and eligible for the normal release flow again.`,
    href,
    uniqueKey: `payment:${paymentOrderId}:dispute-resolved:customer`,
  });
  await createNotification({
    userId: String(context.vendor_owner_clerk_user_id),
    type: "dispute.resolved",
    title: "Payment dispute resolved",
    body: `The dispute for ${service} has been resolved. The booking has returned to the protected payment flow.`,
    href,
    uniqueKey: `payment:${paymentOrderId}:dispute-resolved:vendor`,
  });
}

export async function notifyRefundStatus(
  paymentOrderId: string,
  status: "processing" | "needs_attention" | "processed" | "failed",
) {
  const context = await paymentContext(paymentOrderId);
  if (!context) return;
  const bookingId = String(context.booking_id);
  const service = String(context.service_summary);
  const amount = money(context.amount);
  const href = `/bookings/${bookingId}`;

  const copy = {
    processing: {
      title: "Refund processing",
      customer: `Your ${formatNaira(amount)} refund for ${service} has been submitted to Paystack.`,
      vendor: `A ${formatNaira(amount)} refund for ${service} is being processed. The payout remains paused.`,
    },
    needs_attention: {
      title: "Refund needs attention",
      customer: `The refund for ${service} needs additional provider review. Smitten will keep the payment paused.`,
      vendor: `The refund for ${service} needs additional provider review. The payout remains paused.`,
    },
    processed: {
      title: "Refund completed",
      customer: `Your ${formatNaira(amount)} refund for ${service} has been confirmed by Paystack.`,
      vendor: `The ${formatNaira(amount)} payment for ${service} has been refunded to the customer.`,
    },
    failed: {
      title: "Refund did not complete",
      customer: `The refund for ${service} did not complete. Smitten has returned the payment to a protected state while this is reviewed.`,
      vendor: `The refund for ${service} did not complete. The payment has returned to a protected state.`,
    },
  }[status];

  await createNotification({
    userId: String(context.customer_clerk_user_id),
    type: `refund.${status}`,
    title: copy.title,
    body: copy.customer,
    href,
    uniqueKey: `payment:${paymentOrderId}:refund-${status}:customer`,
  });
  await createNotification({
    userId: String(context.vendor_owner_clerk_user_id),
    type: `refund.${status}`,
    title: copy.title,
    body: copy.vendor,
    href,
    uniqueKey: `payment:${paymentOrderId}:refund-${status}:vendor`,
  });

  if (status === "needs_attention" || status === "failed") {
    for (const userId of await adminIds()) {
      await createNotification({
        userId,
        type: `refund.${status}`,
        title: copy.title,
        body: `${service} requires finance review.`,
        href: "/admin/payments",
        uniqueKey: `payment:${paymentOrderId}:refund-${status}:admin:${userId}`,
      });
    }
  }
}

export async function listNotifications(userId: string, limit = 60): Promise<NotificationView[]> {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const rows = await getSql()`
    SELECT id,type,title,body,href,read_at,created_at
    FROM notifications
    WHERE clerk_user_id=${userId}
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    href: row.href ? String(row.href) : null,
    readAt: row.read_at ? new Date(String(row.read_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));
}

export async function getUnreadNotificationCount(userId: string) {
  const rows = await getSql()`
    SELECT COUNT(*)::int AS count
    FROM notifications
    WHERE clerk_user_id=${userId} AND read_at IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await getSql()`
    UPDATE notifications
    SET read_at=COALESCE(read_at,now())
    WHERE id=${notificationId} AND clerk_user_id=${userId}
  `;
}

export async function markAllNotificationsRead(userId: string) {
  await getSql()`
    UPDATE notifications
    SET read_at=COALESCE(read_at,now())
    WHERE clerk_user_id=${userId} AND read_at IS NULL
  `;
}
