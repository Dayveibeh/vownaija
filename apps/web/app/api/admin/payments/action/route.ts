import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/accounts";
import { initiatePaymentRefund, reconcileAdminPayment, resolvePaymentDispute } from "@/lib/payments";

const schema = z.object({
  paymentOrderId: z.string().trim().min(1),
  action: z.enum(["resolve_dispute", "refund", "reconcile"]),
  reason: z.string().trim().max(1200).optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  const profile = await getUserProfile(userId);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ message: "Smitten admin access required." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid request." }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Invalid finance action." }, { status: 400 });

  try {
    if (parsed.data.action === "resolve_dispute") {
      const result = await resolvePaymentDispute(parsed.data.paymentOrderId, userId);
      return NextResponse.json({ ok: true, action: parsed.data.action, ...result });
    }

    if (parsed.data.action === "reconcile") {
      const result = await reconcileAdminPayment(parsed.data.paymentOrderId, userId);
      return NextResponse.json({ ok: true, action: parsed.data.action, ...result });
    }

    const result = await initiatePaymentRefund(
      parsed.data.paymentOrderId,
      userId,
      parsed.data.reason || "Refund approved by Smitten support",
    );
    return NextResponse.json({ ok: true, action: parsed.data.action, ...result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const known: Record<string, string> = {
      DISPUTE_NOT_FOUND: "There is no open dispute for this payment.",
      PAYMENT_NOT_FOUND: "Payment not found.",
      PAYOUT_ALREADY_RELEASED: "This payout has already been released and cannot be refunded through this control.",
      PAYOUT_ALREADY_STARTED: "This payout is already queued or processing and cannot be refunded from this control.",
      PAYMENT_ALREADY_REFUNDED: "This payment has already been refunded.",
      PAYMENT_NOT_REFUNDABLE: "Only a successfully paid transaction can be refunded.",
      REFUND_ALREADY_IN_PROGRESS: "A refund is already being processed for this payment.",
      PAYSTACK_NOT_CONFIGURED: "Paystack is not configured on this deployment.",
      LIVE_REFUNDS_DISABLED: "Live refunds are disabled until production refund controls are explicitly enabled.",
      PAYSTACK_VERIFY_FAILED: "Paystack could not verify this transaction.",
      PAYMENT_MISMATCH: "Paystack returned transaction details that do not match Smitten's record.",
    };
    if (known[code]) return NextResponse.json({ message: known[code] }, { status: 409 });

    console.error("Admin finance action failed", error);
    return NextResponse.json({ message: code || "The finance action could not be completed." }, { status: 500 });
  }
}
