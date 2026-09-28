import { NextResponse } from "next/server";
import { reconcilePaystackPayment } from "@/lib/payments";
import { getPublicRequestOrigin } from "@/lib/request-origin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getPublicRequestOrigin(request);
  const reference = url.searchParams.get("reference")?.trim();

  if (!reference) {
    return NextResponse.redirect(new URL("/?payment=missing-reference", origin));
  }

  try {
    const result = await reconcilePaystackPayment(reference);
    const status = result.payment.status === "paid" ? "success" : result.payment.status;
    return NextResponse.redirect(
      new URL(`/bookings/${result.bookingId}?payment=${encodeURIComponent(status)}`, origin),
    );
  } catch (error) {
    console.error("Paystack callback verification failed", error);
    return NextResponse.redirect(new URL("/?payment=verification-failed", origin));
  }
}
