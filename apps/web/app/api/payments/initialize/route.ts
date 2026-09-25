import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/accounts";
import { initializeBookingPayment } from "@/lib/payments";

const schema = z.object({ bookingId: z.string().trim().min(1) });

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  const profile = await getUserProfile(userId);
  if (!profile || profile.role !== "couple") {
    return NextResponse.json({ message: "Only the customer can pay for this booking." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid request." }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Booking is required." }, { status: 400 });

  try {
    const result = await initializeBookingPayment(parsed.data.bookingId, userId, new URL(request.url).origin);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "BOOKING_NOT_FOUND") return NextResponse.json({ message: "Booking not found." }, { status: 404 });
    if (code === "BOOKING_ALREADY_PAID") return NextResponse.json({ message: "This booking is already fully paid." }, { status: 409 });
    if (code === "PAYSTACK_NOT_CONFIGURED") return NextResponse.json({ message: "Paystack test checkout is not configured on this deployment yet." }, { status: 503 });
    console.error("Failed to initialize booking payment", error);
    return NextResponse.json({ message: "We couldn’t start checkout just now." }, { status: 500 });
  }
}
