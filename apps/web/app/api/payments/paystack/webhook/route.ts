import { NextResponse } from "next/server";
import { reconcilePaystackPayment, validatePaystackWebhook } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  if (!validatePaystackWebhook(rawBody, signature)) {
    return NextResponse.json({ message: "Invalid signature." }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try { event = JSON.parse(rawBody) as typeof event; }
  catch { return NextResponse.json({ message: "Invalid payload." }, { status: 400 }); }

  if (event.event === "charge.success" && event.data?.reference) {
    try {
      await reconcilePaystackPayment(event.data.reference);
    } catch (error) {
      console.error("Paystack webhook reconciliation failed", error);
      return NextResponse.json({ received: true, reconciled: false });
    }
  }

  return NextResponse.json({ received: true });
}
