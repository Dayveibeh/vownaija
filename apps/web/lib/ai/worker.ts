import { aiEnabled, publicOrigin, required, workerConfig } from "./config";
import { recommend, billingGateway } from "./agent";
import { formatReply } from "./recommendations";
import { claimJob, cleanup, createGeneration, failJob, history, markSending, markSent, reserveGeneration, saveAnswer, saveStaticReply, saveStep } from "./store";
import { decryptPhone, DeliveryError, REPLY_WINDOW_MS, sendReply } from "./whatsapp";
import { getSql } from "../../db";

const defaultServices = { claimJob, createGeneration, failJob, history, markSending, markSent, reserveGeneration, saveAnswer, saveStaticReply, saveStep, recommend, sendReply };
export type WorkerServices = typeof defaultServices;

export async function processNextJob(overrides: Partial<WorkerServices> = {}) {
  const services = { ...defaultServices, ...overrides };
  if (!aiEnabled()) return false;
  const config = workerConfig();
  const job = await services.claimJob();
  if (!job) return false;
  let sending = false;
  try {
    if (job.phone_number_id !== required("WHATSAPP_PHONE_NUMBER_ID")) {
      await services.failJob(job, "BUSINESS_NUMBER_CHANGED", false); return true;
    }
    if (Date.now() - new Date(job.received_at).getTime() >= REPLY_WINDOW_MS) {
      await services.failJob(job, "REPLY_WINDOW_CLOSED", false); return true;
    }
    let reply = job.reply_text;
    if (!reply) {
      if (job.kind !== "text") {
        reply = "SmittenAI: Please send a text message with the wedding service, city and budget you're looking for—for example, bead stylists in Lagos.";
        await services.saveStaticReply(job, reply);
      } else if (!await services.reserveGeneration(job)) {
        reply = `SmittenAI: I've reached the chat limit for now. Please try again later, or browse vendors on Smitten: ${publicOrigin()}/#featured`;
        await services.saveStaticReply(job, reply);
      } else {
        const start = Date.now();
        const id = await services.createGeneration(job, config.model);
        job.generation_id = id;
        const context = await services.history(job);
        const { answer, shortlist } = await services.recommend(config.model, [...context, { role: "user", content: job.prompt }], {
          onStep: (step, receipt) => services.saveStep(id, step, receipt),
        });
        reply = formatReply(answer, shortlist, `${publicOrigin()}/ai/shortlists/${id}`);
        await services.saveAnswer(job, id, answer, shortlist, reply, Date.now() - start);
      }
      job.reply_text = reply;
    }
    if (!await services.markSending(job)) { await services.failJob(job, "LEASE_OR_WINDOW_EXPIRED", false); return true; }
    sending = true;
    const outboundId = await services.sendReply(decryptPhone(job.phone_cipher), job.id, reply);
    await services.markSent(job, outboundId);
  } catch (error) {
    const delivery = error instanceof DeliveryError;
    await services.failJob(job, delivery ? error.ambiguous ? "DELIVERY_ACK_UNKNOWN" : "DELIVERY_REJECTED" : sending ? "DELIVERY_ACK_UNKNOWN" : "GENERATION_FAILED",
      delivery ? error.retryable : !sending, delivery ? error.ambiguous : sending);
    // Do not log message contents, phone numbers, access tokens or provider responses.
    console.error("SmittenAI job failed", { stage: sending ? "delivery" : "generation", attempt: job.attempts });
  }
  return true;
}

export async function maintenance() {
  await cleanup();
  const sql = getSql();
  const rows = await sql`SELECT generation_id, step, receipt FROM smitten_ai_steps
    WHERE receipt->>'costUsd' IS NULL AND receipt->>'gatewayGenerationId' IS NOT NULL
    ORDER BY COALESCE(receipt->>'costLookupAt',''), generation_id, step LIMIT 5`;
  for (const row of rows) {
    await sql`UPDATE smitten_ai_steps SET receipt = jsonb_set(receipt, '{costLookupAt}', ${JSON.stringify(new Date().toISOString())}::jsonb)
      WHERE generation_id = ${row.generation_id} AND step = ${row.step}`;
    try {
      const info = await billingGateway.getGenerationInfo({ id: String(row.receipt.gatewayGenerationId) });
      if (Number.isFinite(info.totalCost) && info.totalCost >= 0) {
        await sql`UPDATE smitten_ai_steps SET receipt = jsonb_set(receipt, '{costUsd}', ${JSON.stringify(info.totalCost)}::jsonb)
          WHERE generation_id = ${row.generation_id} AND step = ${row.step}`;
        await sql`UPDATE smitten_ai_generations SET cost_usd =
          (SELECT CASE WHEN count(*) FILTER (WHERE receipt->>'costUsd' IS NULL) = 0 THEN sum((receipt->>'costUsd')::numeric) END
            FROM smitten_ai_steps WHERE generation_id = ${row.generation_id}) WHERE id = ${row.generation_id}`;
      }
    } catch { /* Keep unknown cost and its lookup ID for a future pass. */ }
  }
}
