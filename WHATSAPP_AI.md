# Phase 4 — SmittenAI on WhatsApp

Phase 3 is accepted and PR #13 is merged. **Phase 4 is the WhatsApp wedding-vendor assistant.** The marketplace-readiness and pilot-launch roadmap is **Phase 5**.

A customer texts Smitten's WhatsApp business number, for example: “Recommend bead stylists in Lagos.” SmittenAI searches active, onboarded Smitten businesses and public web sources, returns up to five sourced options, and links to a saved shortlist on the Smitten website. Follow-ups can refine the area, style or budget in ₦. This implementation handles text messages; other message types receive a request to send text.

Registered vendors link to existing `/vendor/[vendorId]` profiles, where the existing enquiry and booking journey continues. Web alternatives link to the original source and are labelled **Found on the web**. Demo vendors are excluded. IDs and source URLs must come from the current search results; unsupported picks are discarded. Web pricing is not quoted. Semantic relevance still depends on the model and source quality: a retrieved URL alone is not proof of a vendor's qualifications or availability.

The first release redirects to the responsive website. Native app shortlist handling and universal links are not included. The read-only `/api/ai/shortlists/[id]` endpoint provides a future mobile integration point. The removed dashboard AI cards and customer sidebar stay removed.

## Hosting and storage

| Component | Location |
| --- | --- |
| Source and setup guide | GitHub `Dayveibeh/vownaija`, review branch `phase4/whatsapp-ai` |
| Webhook and shortlist website | Existing Smitten Next.js app on the InterServer VPS, managed by Coolify |
| Background processing | A second Coolify service on the same VPS, running `npm run whatsapp:worker` |
| Jobs, private chat history, model receipts and saved shortlists | Existing Neon PostgreSQL database |
| WhatsApp transport | Meta WhatsApp Business Platform Cloud API |
| Model and public web search | Vercel AI Gateway API; it works from Coolify and does not require moving the website to Vercel |
| Vercel project `vownaija` | Existing website previews; it does not run this persistent worker |

The webhook durably queues requests before acknowledging Meta. A worker claims a five-minute lease, processes each conversation in order, and retries recoverable failures up to three claims. The provider message ID is the primary key, so webhook retries do not create duplicate jobs. Replies are saved before delivery; a rejected send can reuse the reply without another model call.

An uncertain send acknowledgement is marked `ambiguous` and is not automatically resent. Check Meta delivery information before manually resolving it. Delivery status events are acknowledged but do not trigger the assistant. Free-form replies are never attempted beyond 24 hours from the incoming message; this implementation does not send marketing or out-of-window templates.

## Configuration

Keep existing Neon, Clerk and Paystack settings. Add these secrets as **runtime** variables to the web service and worker. Never use `NEXT_PUBLIC_` for these secrets or paste them into GitHub.

| Variable | Value |
| --- | --- |
| `SMITTEN_WHATSAPP_ENABLED` | `true` only when ready to accept messages; defaults to disabled |
| `SMITTEN_PUBLIC_URL` | The existing Coolify application's HTTPS origin, with no subpath |
| `DATABASE_URL` or `POSTGRES_URL` | Existing Neon connection string, shared by the two services |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Smitten's Meta WhatsApp Business Account ID |
| `WHATSAPP_PHONE_NUMBER_ID` | The registered business phone-number ID, not its display number |
| `WHATSAPP_APP_SECRET` | App secret for the Meta application subscribed to that account |
| `WHATSAPP_VERIFY_TOKEN` | A new random secret chosen for webhook verification (web service only) |
| `WHATSAPP_ACCESS_TOKEN` | A suitable long-lived system-user token permitted to send WhatsApp messages |
| `WHATSAPP_GRAPH_API_VERSION` | The currently supported Graph API version used by your Meta app, in `vNN.0` format; no version is hardcoded |
| `WHATSAPP_STORAGE_KEY` | Base64 encoding of 32 random bytes; use the same persistent key in both services |
| `AI_GATEWAY_API_KEY` | Server-side AI Gateway API key with funded access and a configured spending limit |
| `SMITTEN_AI_MODEL` | Optional model ID; default `openai/gpt-6.1-sol`, confirmed in the model catalog on 30 September 2026 |

Generate the storage key locally with `openssl rand -base64 32` and the verify token with `openssl rand -hex 32`. Store them securely. Changing the storage key without re-encrypting existing jobs prevents their delivery. Changing the app secret changes the derived conversation identity and starts new chat histories.

AI Gateway also provides the Parallel web-search tool. No separate Parallel key is required for this implementation. Model calls and web searches incur usage charges. Each generation is limited to six steps, 2,200 output tokens per step and a 90-second operation timeout. Atomic counters allow at most 10 generation starts per phone per UTC hour and 500 total starts per UTC day, including retries. Configure an AI Gateway monetary spending limit as well; request counters are not a dollar cap.

## Deploy with Coolify on the existing VPS

Review and merge the Phase 4 branch into `main` before production activation. For isolated testing, use the review branch with a staging domain, a staging database and Meta's test business number. Do not enable a Vercel preview webhook against the production database or run two different releases as workers against the same queue.

For the **existing web application**, retain the verified build configuration:

```text
Repository: Dayveibeh/vownaija
Branch: main (after merge)
Base directory: /
Install: npm ci --include=dev
Build: npm run build:vercel
Start: npm --workspace @smitten/web run start -- --hostname 0.0.0.0 --port 3000
Port: 3000
Node: 22.13.0 or newer
```

Make the real Clerk publishable key available during build and runtime. This guide does not change the existing account or payment setup.

Create a **second Coolify service** from the same repository and commit for the worker. Use the same install command, base directory and Node version; its start command is `npm run whatsapp:worker`. It does not serve HTTP, so configure it without a public domain, an exposed port or an HTTP health check. If the selected build pack requires a build command, `npm run typecheck:whatsapp` is sufficient. `tsx` is a runtime dependency; the optional worker type check also needs the TypeScript development dependency. Enable restart on failure. Set a graceful shutdown timeout of at least 120 seconds to allow an active generation and send to finish. Start with one worker instance.

The worker creates its new tables idempotently on startup. Start it before attaching Meta's webhook so cold schema creation does not delay webhook acknowledgement. Back up the database through the existing managed service before production rollout.

In the Meta app's WhatsApp configuration, register:

```text
Callback URL: https://YOUR-SMITTEN-DOMAIN/api/whatsapp/webhook
Verify token: the same WHATSAPP_VERIFY_TOKEN configured in Coolify
Webhook field: messages
```

Complete account/phone registration and subscribe the Meta app to the correct WhatsApp Business Account. Publish the business profile and privacy information required for that account. SmittenAI is scoped to Smitten's wedding marketplace and support; review the current WhatsApp Business Platform terms during account activation. Meta's approval and account configuration are not accomplished by deploying this repository.

## Persistence and operations

Each model attempt receives a UUID before its first call. Private `smitten_ai_generations` and `smitten_ai_steps` rows record the model, prompt, result, token usage, duration and Gateway generation IDs. Known provider costs are stored; unknown costs remain `NULL`, and the worker periodically looks them up from Gateway. Interrupted or failed calls can have partial receipts; no cost is presented as zero when it is unknown.

Phone numbers are encrypted with AES-256-GCM. Conversation keys use HMAC and are scoped to the business number. Message contents and model prompts remain private database data. Apply the same access controls and backup policy as other account data. Worker logs exclude message contents, phone numbers and credentials.

Shortlist UUID links can be shared by anyone who receives the link. Public pages/API expose only the title, vendor recommendations and sourcing date, never phone numbers, chat history, model receipts or raw prompts. Links expire after 30 days and are excluded from search indexing. The worker deletes expired generations, jobs and quota counters during periodic maintenance; backups follow the database's retention policy.

Operational queries (use a trusted database console; never expose a public admin endpoint):

```sql
SELECT status, count(*) FROM smitten_whatsapp_jobs GROUP BY status;
SELECT id, error_code, attempts, created_at FROM smitten_whatsapp_jobs
WHERE status IN ('failed','ambiguous') ORDER BY created_at DESC;
SELECT model, count(*) AS generations, sum(cost_usd) AS known_cost_usd,
       count(*) FILTER (WHERE cost_usd IS NULL) AS unknown_cost_generations
FROM smitten_ai_generations GROUP BY model;
```

If delivery is marked ambiguous, check Meta before retrying. Do not blindly reset `sending`/`ambiguous` jobs. Turning off the feature prevents new processing; queued messages expire when their reply window closes.

## Verification and acceptance

Run `npm run test:whatsapp`, `npm run typecheck:whatsapp` and `npm run build:vercel` with the existing build configuration. Automated tests use mocked model/Meta responses and do not send real WhatsApp messages or consume paid model credits.

The live acceptance check, after configuring staging credentials, is:

- Message the test number asking for bead stylists in Lagos. Confirm real catalog results and cited web alternatives, excluding demo vendors.
- Ask for cheaper options in Ikeja. Confirm that the new search uses the conversation context.
- Open the returned link on a phone. Verify source labels, vendor profile/enquiry navigation and original source links.
- Retry the same signed inbound event. Confirm one queue row, one completed generation and one normal reply.
- Restart the worker after queuing a message. Confirm it resumes processing within the 24-hour reply window.
- Verify failure/rate-limit/uncertain-delivery handling, recorded token usage and reconciled costs.

No live WhatsApp account, AI credentials or authenticated staging database were available during implementation. Live Meta delivery, database queue behavior and real vendor search relevance therefore require the staging acceptance check. The implementation is disabled until configured; a successful source save or build is not a deployment or a completed Phase 4 acceptance.

Primary references: [Meta Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api), [Meta webhook signature verification](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/), [AI Gateway web search](https://vercel.com/docs/ai-gateway/models-and-providers/web-search), [AI SDK agents](https://ai-sdk.dev/docs/agents/building-agents).
