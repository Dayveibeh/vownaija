import { setTimeout as delay } from "node:timers/promises";
import { aiEnabled, workerConfig } from "../lib/ai/config";
import { ensureAiSchema } from "../lib/ai/store";
import { maintenance, processNextJob } from "../lib/ai/worker";

async function main() {
  if (!aiEnabled()) throw new Error("Set SMITTEN_WHATSAPP_ENABLED=true after configuring the integration");
  workerConfig();
  await ensureAiSchema();
  let stopping = false;
  process.on("SIGTERM", () => { stopping = true; });
  process.on("SIGINT", () => { stopping = true; });
  console.info("SmittenAI WhatsApp worker started");
  let lastMaintenance = 0;
  while (!stopping) {
    try {
      const worked = await processNextJob();
      if (Date.now() - lastMaintenance > 300_000) {
        await maintenance(); lastMaintenance = Date.now();
      }
      if (!worked) await delay(3000);
    } catch {
      console.error("SmittenAI worker storage unavailable; retrying");
      await delay(5000);
    }
  }
  console.info("SmittenAI WhatsApp worker stopped");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Worker startup failed"); process.exitCode = 1; });
