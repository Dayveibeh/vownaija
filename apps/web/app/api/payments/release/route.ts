import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/accounts";
import { getBookingPaymentSummary, paystackMode, releaseBookingPayment } from "@/lib/payments";

const schema = z.object({ bookingId: z.string().trim().min(1) });

function payoutProviderMessage(code: string) {
  const normalized = code.toLowerCase();

  if (normalized.includes("starter business") || normalized.includes("third party payouts")) {
    return "Paystack Transfers are unavailable for this business type. Paystack only enables third-party transfers for Registered Businesses.";
  }
  if (normalized.includes("balance is not enough") || normalized.includes("insufficient balance")) {
    return "Paystack rejected the transfer because the transfer balance is insufficient.";
  }
  if (normalized.includes("recipient") && normalized.includes("invalid")) {
    return "Paystack rejected the vendor payout recipient. Remove and reconnect the vendor payout account, then try again.";
  }
  if (normalized.includes("payout") && normalized.includes("hold")) {
    return "Paystack has payouts or transfers on hold for this business. Check the Paystack dashboard or contact Paystack support.";
  }
  if (normalized.includes("otp") || normalized.includes("confirm transfers")) {
    return "Paystack requires transfer approval by OTP. The OTP is sent to the Paystack business owner’s configured phone/email.";
  }
  if (normalized.includes("transfer") && normalized.includes("not available")) {
    return "Paystack Transfers are not currently enabled for this business.";
  }
  if (normalized.includes("registered business")) {
    return "Paystack Transfers require a Registered Business account.";
  }
  return "";
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  const profile = await getUserProfile(userId);
  if (!profile || profile.role !== "couple") {
    return NextResponse.json({ message: "Only the customer can release this payout." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid request." }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Booking is required." }, { status: 400 });
  }

  try {
    const result = await releaseBookingPayment(parsed.data.bookingId, userId);
    const paymentSummary = await getBookingPaymentSummary(parsed.data.bookingId, userId, "couple");
    return NextResponse.json({ ok: true, ...result, paymentSummary }, { status: 200 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "BOOKING_NOT_FOUND") return NextResponse.json({ message: "Booking not found." }, { status: 404 });
    if (code === "PAYOUT_ACCOUNT_REQUIRED") return NextResponse.json({ message: "The vendor needs to connect and verify a payout account before funds can be released." }, { status: 409 });
    if (code === "PAYOUT_ALREADY_RELEASED") return NextResponse.json({ message: "This payout has already been released." }, { status: 409 });
    if (code === "PAYMENT_NOT_READY_FOR_RELEASE") return NextResponse.json({ message: "There is no paid Smitten payment ready for release." }, { status: 409 });
    if (code === "PAYSTACK_NOT_CONFIGURED") return NextResponse.json({ message: "Paystack is not configured on this deployment." }, { status: 503 });
    if (code === "LIVE_PAYOUTS_DISABLED") return NextResponse.json({ message: "Live payout releases are disabled. Smitten is currently allowing test-mode releases only." }, { status: 403 });
    if (code === "PAYOUT_OTP_REQUIRED") return NextResponse.json({ message: "Paystack requires transfer approval by OTP. The code is sent to the Paystack business owner’s configured phone/email." }, { status: 409 });

    const providerMessage = payoutProviderMessage(code);
    if (providerMessage) {
      console.error("Paystack rejected payout release", { code });
      return NextResponse.json({ message: providerMessage }, { status: 409 });
    }

    console.error("Failed to release vendor payout", error);
    if (paystackMode() === "test" && code && !code.includes("sk_test_") && !code.includes("sk_live_")) {
      return NextResponse.json({ message: `Paystack test transfer failed: ${code}` }, { status: 502 });
    }
    return NextResponse.json({ message: "We couldn’t release this payout just now." }, { status: 500 });
  }
}
