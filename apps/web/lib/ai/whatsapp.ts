import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { required } from "./config";

export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;
export type InboundMessage = { id: string; from: string; phoneNumberId: string; receivedAt: Date; text: string; kind: "text" | "unsupported" };

export function equalSecret(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifySignature(body: Uint8Array, signature: string | null, secret: string) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}

const payloadSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      field: z.string(),
      value: z.object({
        metadata: z.object({ phone_number_id: z.string() }).optional(),
        messages: z.array(z.object({
          id: z.string().min(1).max(500),
          from: z.string().regex(/^\d{7,20}$/),
          timestamp: z.string().regex(/^\d+$/),
          type: z.string(),
          text: z.object({ body: z.string().max(4096) }).optional(),
        })).max(100).optional(),
      }),
    })).max(100),
  })).max(100),
});

export function parseInbound(value: unknown, businessAccountId: string, phoneNumberId: string, now = Date.now()): InboundMessage[] {
  const payload = payloadSchema.parse(value);
  const messages: InboundMessage[] = [];
  for (const entry of payload.entry) {
    if (entry.id !== businessAccountId) continue;
    for (const change of entry.changes) {
      if (change.field !== "messages" || change.value.metadata?.phone_number_id !== phoneNumberId) continue;
      for (const message of change.value.messages ?? []) {
        const time = Number(message.timestamp) * 1000;
        if (!Number.isFinite(time) || time > now + 300_000 || now - time >= REPLY_WINDOW_MS) continue;
        const text = message.type === "text" ? message.text?.body.trim() : undefined;
        messages.push({ id: message.id, from: message.from, phoneNumberId, receivedAt: new Date(time),
          kind: text ? "text" : "unsupported", text: text || "" });
      }
    }
  }
  return messages;
}

export function conversationKey(phone: string, phoneNumberId: string, secret = required("WHATSAPP_APP_SECRET")) {
  return createHmac("sha256", secret).update(`${phoneNumberId}:${phone}`).digest("hex");
}

export function encryptPhone(phone: string, key = required("WHATSAPP_STORAGE_KEY")) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
  const encrypted = Buffer.concat([cipher.update(phone, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

export function decryptPhone(encoded: string, key = required("WHATSAPP_STORAGE_KEY")) {
  const data = Buffer.from(encoded, "base64");
  const cipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "base64"), data.subarray(0, 12));
  cipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString("utf8");
}

// A timeout can mean Meta accepted the message but its acknowledgement was lost.
// Do not automatically resend ambiguous deliveries and risk sending duplicates.
export class DeliveryError extends Error {
  constructor(public retryable: boolean, public ambiguous: boolean) { super("WhatsApp delivery failed"); }
}

export async function sendReply(phone: string, inboundId: string, text: string, fetcher = fetch) {
  if (!/^\d{7,20}$/.test(phone) || text.length > 4096 || !text.trim()) throw new DeliveryError(false, false);
  const version = required("WHATSAPP_GRAPH_API_VERSION");
  if (!/^v\d+\.\d+$/.test(version)) throw new DeliveryError(false, false);
  let response: Response;
  try {
    response = await fetcher(`https://graph.facebook.com/${version}/${encodeURIComponent(required("WHATSAPP_PHONE_NUMBER_ID"))}/messages`, {
      method: "POST", signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${required("WHATSAPP_ACCESS_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: phone, type: "text",
        context: { message_id: inboundId }, text: { preview_url: false, body: text } }),
    });
  } catch { throw new DeliveryError(false, true); }
  if (!response.ok) throw new DeliveryError(response.status === 429, response.status >= 500);
  const result = await response.json().catch(() => null);
  if (!result?.messages?.[0]?.id) throw new DeliveryError(false, true);
  return String(result.messages[0].id);
}
