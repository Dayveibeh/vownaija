import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/accounts";
import { getBookingPaymentSummary, releaseBookingPayment } from "@/lib/payments";

const schema = z.object({ bookingId: z.string().trim().min(1) });

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
    if (code === "PAYOUT_OTP_REQUIRED") return NextResponse.json({ message: "Paystack requires transfer confirmation. Disable 'Confirm transfers before sending' in the Paystack test preferences before testing automated releases." }, { status: 409 });
    console.error("Failed to release vendor payout", error);
    return NextResponse.json({ message: "We couldn’t release this payout just now." }, { status: 500 });
  }
}
