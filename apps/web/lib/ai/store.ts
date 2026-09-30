import { randomUUID } from "node:crypto";
import { ensureDatabaseSchema, getSql } from "../../db";
import { conversationKey, encryptPhone, type InboundMessage } from "./whatsapp";
import type { ListedVendor, Shortlist } from "./recommendations";

let schemaPromise: Promise<void> | null = null;
export async function ensureAiSchema() {
  if (!schemaPromise) schemaPromise = (async () => {
    const sql = getSql();
    await sql`CREATE TABLE IF NOT EXISTS smitten_ai_generations (
      id uuid PRIMARY KEY, conversation_key text NOT NULL, prompt text NOT NULL, model text NOT NULL,
      status text NOT NULL DEFAULT 'running', answer jsonb, shortlist jsonb,
      input_tokens integer NOT NULL DEFAULT 0, output_tokens integer NOT NULL DEFAULT 0,
      cost_usd numeric(16,8), duration_ms integer, created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days'
    )`;
    await sql`CREATE TABLE IF NOT EXISTS smitten_ai_steps (
      generation_id uuid NOT NULL REFERENCES smitten_ai_generations(id) ON DELETE CASCADE,
      step integer NOT NULL, receipt jsonb NOT NULL, PRIMARY KEY (generation_id, step)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS smitten_whatsapp_jobs (
      id text PRIMARY KEY, conversation_key text NOT NULL, phone_cipher text NOT NULL, phone_number_id text NOT NULL,
      prompt text NOT NULL, kind text NOT NULL, received_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'queued', attempts integer NOT NULL DEFAULT 0,
      next_attempt_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid,
      generation_id uuid REFERENCES smitten_ai_generations(id) ON DELETE SET NULL, reply_text text, outbound_id text, error_code text
    )`;
    await sql`CREATE INDEX IF NOT EXISTS smitten_whatsapp_queue_idx ON smitten_whatsapp_jobs(status, next_attempt_at)`;
    await sql`CREATE INDEX IF NOT EXISTS smitten_whatsapp_conversation_idx ON smitten_whatsapp_jobs(conversation_key, created_at)`;
    await sql`CREATE TABLE IF NOT EXISTS smitten_ai_quotas (
      bucket text PRIMARY KEY, used integer NOT NULL DEFAULT 1, expires_at timestamptz NOT NULL
    )`;
  })().catch(error => { schemaPromise = null; throw error; });
  await schemaPromise;
}

export async function enqueue(messages: InboundMessage[]) {
  await ensureAiSchema();
  for (const message of messages) {
    await getSql()`INSERT INTO smitten_whatsapp_jobs(id, conversation_key, phone_cipher, phone_number_id, prompt, kind, received_at)
      VALUES (${message.id}, ${conversationKey(message.from, message.phoneNumberId)}, ${encryptPhone(message.from)},
        ${message.phoneNumberId}, ${message.text}, ${message.kind}, ${message.receivedAt.toISOString()})
      ON CONFLICT (id) DO NOTHING`;
  }
}

export type Job = { id: string; conversation_key: string; phone_cipher: string; phone_number_id: string; prompt: string;
  kind: string; received_at: string; attempts: number; generation_id: string | null; reply_text: string | null; lease_token: string };

export async function claimJob(): Promise<Job | null> {
  await ensureAiSchema();
  const sql = getSql();
  // Never retry a send whose acknowledgement might have been lost on a restart.
  await sql`UPDATE smitten_whatsapp_jobs SET status = 'ambiguous', error_code = 'DELIVERY_ACK_UNKNOWN'
    WHERE status = 'sending' AND lease_until < now()`;
  await sql`UPDATE smitten_whatsapp_jobs SET status = 'expired', error_code = 'REPLY_WINDOW_CLOSED'
    WHERE status IN ('queued','ready','processing') AND received_at <= now() - interval '24 hours'`;
  await sql`UPDATE smitten_whatsapp_jobs SET status = 'failed', error_code = 'ATTEMPTS_EXHAUSTED'
    WHERE status IN ('queued','ready','processing') AND attempts >= 3 AND lease_until < now()`;
  const rows = await sql`WITH candidate AS (
    SELECT j.id FROM smitten_whatsapp_jobs j
    WHERE j.status IN ('queued','ready','processing') AND j.next_attempt_at <= now()
      AND (j.lease_until IS NULL OR j.lease_until < now()) AND j.attempts < 3
      AND NOT EXISTS (SELECT 1 FROM smitten_whatsapp_jobs earlier
        WHERE earlier.conversation_key = j.conversation_key AND earlier.status IN ('queued','ready','processing','sending')
          AND (earlier.created_at, earlier.id) < (j.created_at, j.id))
    ORDER BY j.created_at, j.id FOR UPDATE SKIP LOCKED LIMIT 1
  ) UPDATE smitten_whatsapp_jobs j SET status = 'processing', attempts = attempts + 1,
      lease_until = now() + interval '5 minutes', lease_token = ${randomUUID()}
    FROM candidate WHERE j.id = candidate.id RETURNING j.*`;
  return (rows[0] as Job | undefined) ?? null;
}

export async function history(job: Job) {
  const rows = await getSql()`SELECT prompt, reply_text FROM smitten_whatsapp_jobs
    WHERE conversation_key = ${job.conversation_key} AND status = 'sent' AND kind = 'text'
      AND created_at < (SELECT created_at FROM smitten_whatsapp_jobs WHERE id = ${job.id})
      AND received_at > now() - interval '24 hours'
    ORDER BY created_at DESC LIMIT 6`;
  return rows.reverse().flatMap(row => [
    { role: "user" as const, content: String(row.prompt) },
    { role: "assistant" as const, content: String(row.reply_text) },
  ]);
}

async function quota(bucket: string, maximum: number) {
  const rows = await getSql()`INSERT INTO smitten_ai_quotas(bucket, used, expires_at) VALUES (${bucket}, 1, now() + interval '2 days')
    ON CONFLICT (bucket) DO UPDATE SET used = smitten_ai_quotas.used + 1 WHERE smitten_ai_quotas.used < ${maximum}
    RETURNING used`;
  return rows.length > 0;
}

export async function reserveGeneration(job: Job) {
  const hour = new Date().toISOString().slice(0, 13);
  // Atomic counters cap starts even when two workers are running. Retries count too.
  if (!await quota(`phone:${job.conversation_key}:${hour}`, 10)) return false;
  return quota(`global:${hour.slice(0, 10)}`, 500);
}

export async function createGeneration(job: Job, model: string) {
  const id = randomUUID();
  const sql = getSql();
  await sql.transaction([
    sql`UPDATE smitten_ai_generations SET status = 'interrupted' WHERE id = ${job.generation_id} AND status = 'running'`,
    sql`INSERT INTO smitten_ai_generations(id, conversation_key, prompt, model) VALUES (${id}, ${job.conversation_key}, ${job.prompt}, ${model})`,
    sql`UPDATE smitten_whatsapp_jobs SET generation_id = ${id} WHERE id = ${job.id} AND lease_token = ${job.lease_token}`,
  ]);
  return id;
}

export type StepReceipt = { inputTokens: number; outputTokens: number; costUsd: number | null; durationMs: number;
  gatewayGenerationId: string | null; tools: string[]; text: string; sourceUrls: string[] };
export async function saveStep(id: string, step: number, receipt: StepReceipt) {
  const sql = getSql();
  await sql.transaction([
    sql`INSERT INTO smitten_ai_steps(generation_id, step, receipt) VALUES (${id}, ${step}, ${JSON.stringify(receipt)}::jsonb)
      ON CONFLICT (generation_id, step) DO UPDATE SET receipt = EXCLUDED.receipt`,
    sql`UPDATE smitten_ai_generations SET
      input_tokens = (SELECT COALESCE(sum((receipt->>'inputTokens')::integer),0) FROM smitten_ai_steps WHERE generation_id = ${id}),
      output_tokens = (SELECT COALESCE(sum((receipt->>'outputTokens')::integer),0) FROM smitten_ai_steps WHERE generation_id = ${id}),
      cost_usd = (SELECT CASE WHEN count(*) FILTER (WHERE receipt->>'costUsd' IS NULL) = 0 THEN sum((receipt->>'costUsd')::numeric) END
        FROM smitten_ai_steps WHERE generation_id = ${id}) WHERE id = ${id}`,
  ]);
}

export async function saveAnswer(job: Job, id: string, answer: unknown, shortlist: Shortlist | null, reply: string, duration: number) {
  const sql = getSql();
  await sql.transaction([
    sql`UPDATE smitten_ai_generations SET status = 'complete', answer = ${JSON.stringify(answer)}::jsonb,
      shortlist = ${JSON.stringify(shortlist)}::jsonb, duration_ms = ${duration},
      input_tokens = (SELECT COALESCE(sum((receipt->>'inputTokens')::integer),0) FROM smitten_ai_steps WHERE generation_id = ${id}),
      output_tokens = (SELECT COALESCE(sum((receipt->>'outputTokens')::integer),0) FROM smitten_ai_steps WHERE generation_id = ${id}),
      cost_usd = (SELECT CASE WHEN count(*) FILTER (WHERE receipt->>'costUsd' IS NULL) = 0 THEN sum((receipt->>'costUsd')::numeric) END
        FROM smitten_ai_steps WHERE generation_id = ${id}) WHERE id = ${id}`,
    sql`UPDATE smitten_whatsapp_jobs SET reply_text = ${reply}, status = 'ready'
      WHERE id = ${job.id} AND lease_token = ${job.lease_token}`,
  ]);
}

export async function saveStaticReply(job: Job, reply: string) {
  await getSql()`UPDATE smitten_whatsapp_jobs SET reply_text = ${reply}, status = 'ready' WHERE id = ${job.id} AND lease_token = ${job.lease_token}`;
}

export async function markSending(job: Job) {
  const rows = await getSql()`UPDATE smitten_whatsapp_jobs SET status = 'sending'
    WHERE id = ${job.id} AND lease_token = ${job.lease_token} AND lease_until > now() AND received_at > now() - interval '24 hours'
    RETURNING id`;
  return rows.length > 0;
}

export async function markSent(job: Job, outboundId: string) {
  await getSql()`UPDATE smitten_whatsapp_jobs SET status = 'sent', outbound_id = ${outboundId}, lease_until = NULL
    WHERE id = ${job.id} AND lease_token = ${job.lease_token}`;
}

export async function failJob(job: Job, code: string, retryable: boolean, ambiguous = false) {
  await getSql()`UPDATE smitten_whatsapp_jobs SET status = ${ambiguous ? "ambiguous" : retryable && job.attempts < 3 ? "queued" : "failed"},
    error_code = ${code}, lease_until = NULL, next_attempt_at = now() + interval '1 minute'
    WHERE id = ${job.id} AND lease_token = ${job.lease_token}`;
  if (job.generation_id && !job.reply_text) await getSql()`UPDATE smitten_ai_generations SET status = 'failed'
    WHERE id = ${job.generation_id} AND status = 'running'`;
}

export async function searchListedVendors(service: string, location: string, maxPrice?: number): Promise<ListedVendor[]> {
  await ensureDatabaseSchema();
  const sql = getSql();
  const escaped = (text: string) => `%${text.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await sql`SELECT v.id, v.business_name, v.category, v.location, v.state, v.starting_price, v.about
    FROM marketplace_vendors v JOIN vendor_profiles p ON p.clerk_user_id = v.owner_clerk_user_id
    WHERE v.active = true AND p.onboarding_complete = true
      AND (concat_ws(' ',v.business_name,v.category,v.about,v.styles::text,v.highlights::text) ILIKE ${escaped(service)})
      AND (concat_ws(' ',v.location,v.state) ILIKE ${escaped(location)})
      AND (${maxPrice ?? null}::numeric IS NULL OR v.starting_price <= ${maxPrice ?? null}::numeric)
    ORDER BY v.business_name LIMIT 20`;
  return rows.map(row => ({ id: String(row.id), name: String(row.business_name), service: String(row.category),
    location: [row.location, row.state].filter(Boolean).join(", "), about: String(row.about ?? "").slice(0, 1200),
    startingPrice: row.starting_price == null ? null : Number(row.starting_price) }));
}

export async function getShortlist(id: string): Promise<Shortlist | null> {
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id) || !(process.env.DATABASE_URL || process.env.POSTGRES_URL)) return null;
  await ensureAiSchema();
  const rows = await getSql()`SELECT shortlist FROM smitten_ai_generations
    WHERE id = ${id} AND status = 'complete' AND shortlist IS NOT NULL AND shortlist <> 'null'::jsonb AND expires_at > now()`;
  return rows[0]?.shortlist as Shortlist | undefined ?? null;
}

export async function cleanup() {
  await getSql()`DELETE FROM smitten_whatsapp_jobs WHERE received_at < now() - interval '30 days'`;
  await getSql()`DELETE FROM smitten_ai_generations WHERE expires_at < now()`;
  await getSql()`DELETE FROM smitten_ai_quotas WHERE expires_at < now()`;
}
