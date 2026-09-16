import {
  coupleVendorFromMarketplaceRecord,
  type CoupleVendor,
  type MarketplaceVendorListResponse,
} from "@smitten/shared";

const DEFAULT_API_BASE_URL = "https://vownaija-git-phase1-core-foundation-dayveibehs-projects.vercel.app";

function apiBaseUrl() {
  const configured = typeof process !== "undefined"
    ? process.env.EXPO_PUBLIC_API_BASE_URL?.trim()
    : undefined;
  return (configured || DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

export async function loadMarketplaceVendors(signal?: AbortSignal): Promise<CoupleVendor[]> {
  const response = await fetch(`${apiBaseUrl()}/api/vendors`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) throw new Error(`Marketplace request failed with ${response.status}`);

  const result = await response.json() as MarketplaceVendorListResponse;
  if (result.market !== "NG" || result.currency !== "NGN" || !Array.isArray(result.vendors)) {
    throw new Error("Unexpected marketplace response");
  }

  return result.vendors.map(coupleVendorFromMarketplaceRecord);
}
