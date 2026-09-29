import { NextResponse } from "next/server";
import {
  claimPaystackWebhookEvent,
  finishPaystackWebhookEvent,
  reconcilePaystackPayment,
  reconcilePaystackRefundEvent,
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
    transaction_reference?: string;
    refund_reference?: string | null;
    id?: number;
    status?: string;
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

  const eventType = event.event?.trim() || "unknown";
  const providerReference =
    event.data?.reference?.trim() ||
    event.data?.transaction_reference?.trim() ||
    event.data?.refund_reference?.trim() ||
    (event.data?.id ? String(event.data.id) : null);

  const receipt = await claimPaystackWebhookEvent(
    rawBody,
    eventType,
    providerReference,
    event.data ? { ...event.data } : {},
  );

  if (!receipt.shouldProcess) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.event === "charge.success" && event.data?.reference) {
      await reconcilePaystackPayment(event.data.reference);
    }

    if (
      (event.event === "transfer.success" ||
        event.event === "transfer.failed" ||
        event.event === "transfer.reversed") &&
      event.data?.reference
    ) {
      await reconcilePaystackTransferEvent(event.event, event.data);
    }

    if (
      (event.event === "refund.pending" ||
        event.event === "refund.processing" ||
        event.event === "refund.needs-attention" ||
        event.event === "refund.failed" ||
        event.event === "refund.processed") &&
      event.data?.transaction_reference
    ) {
      await reconcilePaystackRefundEvent(event.event, event.data);
    }

    await finishPaystackWebhookEvent(receipt.eventKey);
    return NextResponse.json({ received: true, duplicate: receipt.duplicate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook reconciliation failed";
    await finishPaystackWebhookEvent(receipt.eventKey, message);
    console.error("Paystack webhook reconciliation failed", error);
    return NextResponse.json(
      { received: true, reconciled: false },
      { status: 500 },
    );
  }
}
