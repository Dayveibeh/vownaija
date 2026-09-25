import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/accounts";
import { getBookingPaymentSummary } from "@/lib/payments";

export async function GET(_request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile) return NextResponse.json({ message: "Account setup required." }, { status: 409 });

  const { bookingId } = await params;
  const summary = await getBookingPaymentSummary(bookingId, userId, profile.role);
  if (!summary) return NextResponse.json({ message: "Booking not found." }, { status: 404 });
  return NextResponse.json({ summary });
}
