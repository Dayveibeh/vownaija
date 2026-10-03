export function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function aiEnabled() {
  return process.env.SMITTEN_WHATSAPP_ENABLED === "true";
}

export function publicOrigin() {
  const url = new URL(required("SMITTEN_PUBLIC_URL"));
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("SMITTEN_PUBLIC_URL must be the HTTPS application origin");
  }
  return url.origin;
}

export function workerConfig() {
  required("AI_GATEWAY_API_KEY");
  required("WHATSAPP_APP_SECRET");
  required("WHATSAPP_ACCESS_TOKEN");
  required("WHATSAPP_BUSINESS_ACCOUNT_ID");
  required("WHATSAPP_PHONE_NUMBER_ID");
  if (Buffer.from(required("WHATSAPP_STORAGE_KEY"), "base64").length !== 32) {
    throw new Error("WHATSAPP_STORAGE_KEY must encode 32 random bytes in base64");
  }
  if (!/^v\d+\.\d+$/.test(required("WHATSAPP_GRAPH_API_VERSION"))) {
    throw new Error("WHATSAPP_GRAPH_API_VERSION must be the supported version from your Meta app, such as vNN.0");
  }
  publicOrigin();
  return { model: process.env.SMITTEN_AI_MODEL?.trim() || "openai/gpt-6.1-sol" };
}
