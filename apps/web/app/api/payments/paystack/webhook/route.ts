import { NextResponse } from "next/server";
import {
  reconcilePaystackPayment,
  reconcilePaystackTransferEvent,
  validatePaystackWebhook,
} from "@/lib/payments";

export const runtime = "nodejs";

type PaystackWebhookEvent = {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    transfer_code?: string | null;
    transferred_at?: string | null;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  if (!validatePaystackWebhook(rawBody, signature)) {
    return NextResponse.json({ message: "Invalid signature." }, { status: 401 });
  }

  let event: PaystackWebhookEvent;
  try { event = JSON.parse(rawBody) as PaystackWebhookEvent; }
  catch { return NextResponse.json({ message: "Invalid payload." }, { status: 400 }); }

  if (event.event === "charge.success" && event.data?.reference) {
    try {
      await reconcilePaystackPayment(event.data.reference);
    } catch (error) {
      console.error("Paystack webhook payment reconciliation failed", error);
      return NextResponse.json({ received: true, reconciled: false });
    }
  }

  if (
    (event.event === "transfer.success" ||
      event.event === "transfer.failed" ||
      event.event === "transfer.reversed") &&
    event.data?.reference
  ) {
    try {
      await reconcilePaystackTransferEvent(event.event, event.data);
    } catch (error) {
      console.error("Paystack webhook payout reconciliation failed", error);
      return NextResponse.json({ received: true, reconciled: false });
    }
  }

  return NextResponse.json({ received: true });
}
