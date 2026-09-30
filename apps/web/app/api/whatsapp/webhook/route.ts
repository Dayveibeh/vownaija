import { aiEnabled, required } from "@/lib/ai/config";
import { enqueue } from "@/lib/ai/store";
import { equalSecret, parseInbound, verifySignature } from "@/lib/ai/whatsapp";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!token) return new Response("WhatsApp is not configured", { status: 503 });
  const params = new URL(request.url).searchParams;
  if (params.get("hub.mode") !== "subscribe" || !equalSecret(params.get("hub.verify_token") || "", token) || !params.get("hub.challenge")) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(params.get("hub.challenge"), { headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: Request) {
  if (!aiEnabled()) return new Response("WhatsApp is not enabled", { status: 503 });
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return new Response("WhatsApp is not configured", { status: 503 });
  const maxBytes = 1024 * 1024;
  if (Number(request.headers.get("content-length")) > maxBytes) return new Response("Payload too large", { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return new Response("Missing body", { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); return new Response("Payload too large", { status: 413 }); }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks);
  if (!verifySignature(body, request.headers.get("x-hub-signature-256"), secret)) return new Response("Invalid signature", { status: 401 });
  let messages;
  try {
    messages = parseInbound(JSON.parse(body.toString("utf8")), required("WHATSAPP_BUSINESS_ACCOUNT_ID"), required("WHATSAPP_PHONE_NUMBER_ID"));
  } catch { return new Response("Invalid webhook payload or configuration", { status: 400 }); }
  try {
    if (messages.length) await enqueue(messages);
    // Acknowledge only after the durable insert. Meta can retry storage failures.
    return Response.json({ received: true });
  } catch { return new Response("Please retry", { status: 503 }); }
}
