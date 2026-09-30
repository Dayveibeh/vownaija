import { z } from "zod";

export type ListedVendor = { id: string; name: string; service: string; location: string; startingPrice: number | null; about: string };
export type WebSource = { url: string; title: string; excerpt: string };
export type Recommendation = { kind: "smitten" | "web"; name: string; service: string; location: string;
  reason: string; url: string; startingPrice: number | null; sourceTitle: string };
export type Shortlist = { title: string; recommendations: Recommendation[]; createdAt: string };

export const answerSchema = z.object({
  intent: z.enum(["recommend", "clarify", "support"]),
  message: z.string().max(700).describe("A brief greeting, clarification question or Smitten support answer. No vendor names, prices or URLs here; recommendations belong in picks."),
  title: z.string().max(100),
  vendorPicks: z.array(z.object({ vendorId: z.string(), reason: z.string().max(240) })).max(5),
  webPicks: z.array(z.object({ sourceUrl: z.string(), name: z.string().max(100), service: z.string().max(100),
    location: z.string().max(100), reason: z.string().max(240) })).max(5),
});

export function safeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !url.hostname.includes(".") || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/.test(url.hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

export function groundRecommendations(answer: z.infer<typeof answerSchema>, vendors: Map<string, ListedVendor>, sources: Map<string, WebSource>) {
  const items: Recommendation[] = [];
  const seen = new Set<string>();
  for (const pick of answer.vendorPicks) {
    const vendor = vendors.get(pick.vendorId);
    if (!vendor || seen.has(vendor.id)) continue;
    seen.add(vendor.id);
    items.push({ kind: "smitten", name: vendor.name, service: vendor.service, location: vendor.location,
      reason: pick.reason, startingPrice: vendor.startingPrice, url: `/vendor/${encodeURIComponent(vendor.id)}`, sourceTitle: "Listed on Smitten" });
  }
  for (const pick of answer.webPicks) {
    const url = safeSourceUrl(pick.sourceUrl);
    const source = url ? sources.get(url) : undefined;
    if (!source || seen.has(url!) || !pick.name.trim()) continue;
    seen.add(url!);
    items.push({ kind: "web", name: pick.name, service: pick.service, location: pick.location,
      reason: pick.reason, url: url!, startingPrice: null, sourceTitle: source.title });
  }
  return items.slice(0, 5);
}

export function formatReply(answer: z.infer<typeof answerSchema>, shortlist: Shortlist | null, link: string) {
  if (!shortlist?.recommendations.length) {
    return answer.intent === "recommend"
      ? "SmittenAI: I couldn't find a sourced match for that request. Could you share your preferred area, style and budget in ₦? You can also browse Smitten: " + new URL("/#featured", link).href
      : "SmittenAI: " + (answer.message.replace(/https?:\/\/\S+/g, "").trim() || "Which wedding service and city are you looking for?");
  }
  const lines = shortlist.recommendations.map(item => {
    const price = item.startingPrice === null ? "" : ` · from ₦${item.startingPrice.toLocaleString("en-NG")}`;
    return `• ${item.name} (${item.kind === "smitten" ? "Smitten listing" : "Web source"})\n${item.location}${price}\n${item.reason}`;
  });
  return `SmittenAI · ${shortlist.title}\n\n${lines.join("\n\n")}\n\nView your shortlist and sources on Smitten:\n${link}\n\nConfirm pricing and availability with the vendor. Web results are not verified Smitten listings.`.slice(0, 4096);
}
