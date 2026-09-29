import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/accounts";
import { getBookingPaymentSummary, openPaymentDispute } from "@/lib/payments";

const schema = z.object({
  bookingId: z.string().trim().min(1),
  reason: z.string().trim().min(10).max(1200),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  const profile = await getUserProfile(userId);
  if (!profile || profile.role !== "couple") {
    return NextResponse.json({ message: "Only the customer can report a payment problem." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid request." }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Tell us what went wrong in at least 10 characters." }, { status: 400 });
  }

  try {
    const result = await openPaymentDispute(parsed.data.bookingId, userId, parsed.data.reason);
    const paymentSummary = await getBookingPaymentSummary(parsed.data.bookingId, userId, "couple");
    return NextResponse.json({ ok: true, ...result, paymentSummary });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PAYMENT_NOT_FOUND") return NextResponse.json({ message: "No paid transaction was found for this booking." }, { status: 404 });
    if (code === "PAYOUT_ALREADY_RELEASED") return NextResponse.json({ message: "This payout has already been released. Please contact Smitten support for further help." }, { status: 409 });
    if (code === "PAYOUT_ALREADY_STARTED") return NextResponse.json({ message: "This payout is already being processed and can no longer be paused from the booking page." }, { status: 409 });
    if (code === "PAYMENT_ALREADY_REFUNDED") return NextResponse.json({ message: "This payment has already been refunded." }, { status: 409 });
    if (code === "DISPUTE_ALREADY_OPEN") return NextResponse.json({ message: "A payment dispute is already open for this booking." }, { status: 409 });
    if (code === "DISPUTE_REASON_REQUIRED") return NextResponse.json({ message: "Please provide a little more detail about the problem." }, { status: 400 });
    console.error("Failed to open payment dispute", error);
    return NextResponse.json({ message: "We couldn’t open this dispute just now." }, { status: 500 });
  }
}
