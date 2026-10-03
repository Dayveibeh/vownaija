import assert from "node:assert/strict";
import { before, test } from "node:test";
import { createHmac, randomBytes } from "node:crypto";
import { MockLanguageModelV4 } from "ai/test";
import { GET, POST } from "../app/api/whatsapp/webhook/route";
import { recommend } from "../lib/ai/agent";
import { answerSchema, formatReply, groundRecommendations, safeSourceUrl, type Shortlist } from "../lib/ai/recommendations";
import { conversationKey, decryptPhone, DeliveryError, encryptPhone, parseInbound, REPLY_WINDOW_MS, sendReply, verifySignature } from "../lib/ai/whatsapp";
import { processNextJob, type WorkerServices } from "../lib/ai/worker";
import type { Job, StepReceipt } from "../lib/ai/store";

before(() => {
  Object.assign(process.env, { SMITTEN_WHATSAPP_ENABLED: "true", WHATSAPP_APP_SECRET: "test-app-secret",
    WHATSAPP_VERIFY_TOKEN: "test-verify", WHATSAPP_ACCESS_TOKEN: "test-token", WHATSAPP_BUSINESS_ACCOUNT_ID: "business-1",
    WHATSAPP_PHONE_NUMBER_ID: "phone-1", WHATSAPP_STORAGE_KEY: randomBytes(32).toString("base64"),
    WHATSAPP_GRAPH_API_VERSION: "v99.0", SMITTEN_PUBLIC_URL: "https://smitten.example", AI_GATEWAY_API_KEY: "test-key" });
});

function webhook(now: number, type = "text") {
  return { object: "whatsapp_business_account", entry: [{ id: "business-1", changes: [{ field: "messages", value: {
    metadata: { phone_number_id: "phone-1" }, messages: [{ id: "wamid.1", from: "2348000000000", timestamp: String(Math.floor(now / 1000)), type,
      text: { body: "Find bead stylists in Lagos" } }],
  } }] }] };
}

test("signature verification checks the exact bytes and rejects tampering", () => {
  const body = Buffer.from(JSON.stringify(webhook(Date.now())));
  const signature = "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");
  assert.equal(verifySignature(body, signature, "secret"), true);
  assert.equal(verifySignature(Buffer.concat([body, Buffer.from(" ")]), signature, "secret"), false);
  assert.equal(verifySignature(body, signature, "different"), false);
  assert.equal(verifySignature(body, null, "secret"), false);
  assert.equal(verifySignature(body, "sha256=short", "secret"), false);
});

test("webhook verification returns the challenge only for the configured token", async () => {
  const response = await GET(new Request("https://smitten.example/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test-verify&hub.challenge=123"));
  assert.equal(response.status, 200); assert.equal(await response.text(), "123");
  assert.equal((await GET(new Request("https://smitten.example/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123"))).status, 403);
});

test("POST rejects forged requests before accessing storage and ignores signed status notifications", async () => {
  assert.equal((await POST(new Request("https://smitten.example/api/whatsapp/webhook", { method: "POST", body: "{}" }))).status, 401);
  const body = JSON.stringify({ object: "whatsapp_business_account", entry: [{ id: "business-1", changes: [{ field: "messages", value: { statuses: [{ status: "delivered" }] } }] }] });
  const signature = "sha256=" + createHmac("sha256", process.env.WHATSAPP_APP_SECRET!).update(body).digest("hex");
  assert.equal((await POST(new Request("https://smitten.example/api/whatsapp/webhook", { method: "POST", body, headers: { "x-hub-signature-256": signature } }))).status, 200);
});

test("incoming messages are scoped to the business and phone and expire after 24 hours", () => {
  const now = Date.now();
  assert.equal(parseInbound(webhook(now), "business-1", "phone-1", now).length, 1);
  assert.equal(parseInbound(webhook(now), "another-business", "phone-1", now).length, 0);
  assert.equal(parseInbound(webhook(now), "business-1", "another-phone", now).length, 0);
  assert.equal(parseInbound(webhook(now - REPLY_WINDOW_MS), "business-1", "phone-1", now).length, 0);
  assert.equal(parseInbound(webhook(now + 600_000), "business-1", "phone-1", now).length, 0);
  assert.equal(parseInbound(webhook(now, "image"), "business-1", "phone-1", now)[0].kind, "unsupported");
});

test("phone ciphertext is randomized, authenticated and business-scoped identity is deterministic", () => {
  const phone = "2348000000000";
  const first = encryptPhone(phone), second = encryptPhone(phone);
  assert.notEqual(first, second); assert.equal(decryptPhone(first), phone);
  const tampered = Buffer.from(first, "base64"); tampered[tampered.length - 1] ^= 1;
  assert.throws(() => decryptPhone(tampered.toString("base64")));
  assert.equal(conversationKey(phone, "phone-1"), conversationKey(phone, "phone-1"));
  assert.notEqual(conversationKey(phone, "phone-1"), conversationKey(phone, "phone-2"));
});

const answer = answerSchema.parse({ intent: "recommend", message: "Here are sourced options.", title: "Bead stylists in Lagos",
  vendorPicks: [{ vendorId: "real-vendor", reason: "Offers bridal bead styling in Lagos." }, { vendorId: "invented", reason: "Fabricated option" }],
  webPicks: [{ sourceUrl: "https://beads.example/bridal", name: "Web Beads", service: "Bead styling", location: "Lagos", reason: "The business page describes bridal bead styling in Lagos." },
    { sourceUrl: "https://invented.example/", name: "Invented vendor", service: "Beads", location: "Lagos", reason: "No source" }],
});
const vendor = { id: "real-vendor", name: "Smitten Beads", service: "Accessories", location: "Lagos", startingPrice: 30000, about: "Bridal beads" };

test("grounding drops fabricated IDs and URLs and preserves the Smitten/web distinction", () => {
  const items = groundRecommendations(answer, new Map([[vendor.id, vendor]]), new Map([["https://beads.example/bridal", { url: "https://beads.example/bridal", title: "Web Beads official page", excerpt: "Bridal bead styling in Lagos" }]]));
  assert.equal(items.length, 2); assert.equal(items[0].url, "/vendor/real-vendor"); assert.equal(items[1].kind, "web"); assert.equal(items[1].startingPrice, null);
  assert.equal(groundRecommendations(answer, new Map(), new Map()).length, 0);
  for (const url of ["javascript:alert(1)", "http://beads.example", "https://user:pass@beads.example", "https://127.0.0.1", "https://192.168.1.2", "https://[::1]"]) assert.equal(safeSourceUrl(url), null);
});

const usage = { inputTokens: { total: 50, noCache: 50, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 100, text: 100, reasoning: undefined } };

test("the full agent executes catalog search, consumes actual web tool results, grounds output and records each model call", async () => {
  const model = new MockLanguageModelV4({ doGenerate: [
    { content: [
      { type: "tool-call", toolCallId: "catalog", toolName: "searchSmitten", input: JSON.stringify({ service: "bead", location: "Lagos" }) },
      { type: "tool-call", toolCallId: "web", toolName: "parallel_search", input: JSON.stringify({ objective: "Bridal bead stylists in Lagos" }), providerExecuted: true },
      { type: "tool-result", toolCallId: "web", toolName: "parallel_search", result: { searchId: "search-1", results: [
        { url: "https://beads.example/bridal", title: "Web Beads official page", excerpt: "Bridal bead styling in Lagos" },
      ] } },
    ], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [], providerMetadata: { gateway: { generationId: "gen_first", cost: "0.01" } } },
    { content: [{ type: "text", text: JSON.stringify(answer) }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [], providerMetadata: { gateway: { generationId: "gen_second", cost: "0.02" } } },
  ] });
  const receipts = new Map<number, StepReceipt>(); let searches = 0;
  const result = await recommend("mock", [{ role: "user", content: "Find bead stylists in Lagos" }], {
    model, search: async (service, location) => { assert.equal(service, "bead"); assert.equal(location, "Lagos"); searches++; return [vendor]; },
    onStep: async (step, receipt) => { receipts.set(step, receipt); },
  });
  assert.equal(searches, 1); assert.equal(model.doGenerateCalls.length, 2); assert.equal(result.shortlist?.recommendations.length, 2);
  assert.equal(receipts.size, 2); assert.equal(receipts.get(0)?.gatewayGenerationId, "gen_first");
  assert.equal(receipts.get(1)?.costUsd, 0.02);
  const reply = formatReply(result.answer, result.shortlist, "https://smitten.example/ai/shortlists/abc");
  assert.match(reply, /₦30,000/); assert.match(reply, /Web source/); assert.match(reply, /\/ai\/shortlists\/abc/); assert.ok(reply.length <= 4096);
});

test("Meta delivery uses the configured business endpoint and distinguishes rate limits from ambiguous sends", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const id = await sendReply("2348000000000", "wamid.1", "Hello from SmittenAI", async (url, init) => {
    assert.equal(url, "https://graph.facebook.com/v99.0/phone-1/messages");
    requestBody = JSON.parse(String(init?.body));
    return Response.json({ messages: [{ id: "outbound.1" }] });
  });
  assert.equal(id, "outbound.1"); assert.equal(requestBody?.messaging_product, "whatsapp");
  await assert.rejects(sendReply("2348000000000", "wamid.1", "Hello", async () => new Response("", { status: 429 })), error => error instanceof DeliveryError && error.retryable && !error.ambiguous);
  await assert.rejects(sendReply("2348000000000", "wamid.1", "Hello", async () => { throw new Error("network timeout"); }), error => error instanceof DeliveryError && !error.retryable && error.ambiguous);
});

function fakeWorker() {
  const job: Job = { id: "wamid.1", conversation_key: "hash", phone_cipher: encryptPhone("2348000000000"), phone_number_id: "phone-1",
    prompt: "Show cheaper bead stylists in Ikeja", kind: "text", received_at: new Date().toISOString(), attempts: 1, generation_id: null, reply_text: null, lease_token: "lease" };
  const state = { generationCalls: 0, sends: 0, savedBeforeSend: false, sent: false, failure: "", retryable: false, ambiguous: false };
  const shortlist: Shortlist = { title: answer.title, createdAt: new Date().toISOString(), recommendations: [{ kind: "smitten", name: vendor.name, service: vendor.service, location: vendor.location, url: "/vendor/real-vendor", reason: "Bridal beads", sourceTitle: "Listed on Smitten", startingPrice: 30000 }] };
  const services: Partial<WorkerServices> = {
    claimJob: async () => job, reserveGeneration: async () => true, createGeneration: async () => "a0000000-0000-4000-8000-000000000001",
    history: async () => [{ role: "user", content: "Find beads in Lagos" }, { role: "assistant", content: "A previous sourced shortlist" }],
    recommend: async (_model, messages) => { state.generationCalls++; assert.equal(messages.length, 3); assert.equal(messages[2].content, job.prompt); return { answer, shortlist }; },
    saveAnswer: async (_job, _id, _answer, _shortlist, reply) => { job.reply_text = reply; state.savedBeforeSend = true; },
    saveStaticReply: async (_job, reply) => { job.reply_text = reply; }, markSending: async () => true,
    sendReply: async () => { state.sends++; assert.equal(state.savedBeforeSend, true); return "outbound.1"; },
    markSent: async () => { state.sent = true; },
    failJob: async (_job, code, retryable, ambiguous = false) => { state.failure = code; state.retryable = retryable; state.ambiguous = ambiguous; },
  };
  return { job, state, services };
}

test("delivery retries reuse the saved reply, with no second LLM generation", async () => {
  const { job, state, services } = fakeWorker();
  services.sendReply = async () => { state.sends++; if (state.sends === 1) throw new DeliveryError(true, false); return "outbound.1"; };
  await processNextJob(services); assert.equal(state.retryable, true); assert.ok(job.reply_text);
  job.attempts = 2; await processNextJob(services);
  assert.equal(state.generationCalls, 1); assert.equal(state.sends, 2); assert.equal(state.sent, true);
});

test("expired messages do not trigger generation or delivery; ambiguous delivery is marked for review", async () => {
  const first = fakeWorker(); first.job.received_at = new Date(Date.now() - REPLY_WINDOW_MS - 1000).toISOString();
  await processNextJob(first.services); assert.equal(first.state.generationCalls, 0); assert.equal(first.state.sends, 0); assert.equal(first.state.failure, "REPLY_WINDOW_CLOSED");
  const second = fakeWorker(); second.services.sendReply = async () => { throw new DeliveryError(false, true); };
  await processNextJob(second.services); assert.equal(second.state.ambiguous, true); assert.equal(second.state.retryable, false);
});
