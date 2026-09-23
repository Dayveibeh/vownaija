import { apiBaseUrl } from "./marketplace";

export type MobileCustomerPreferences = {
  weddingDate?: string | null;
  weddingLocation?: string | null;
  weddingState?: string | null;
  weddingType?: string | null;
  guestCount?: string | null;
  budgetBand?: string | null;
  budgetCeiling?: string | number | null;
  currencyCode?: string;
  weddingStyle?: string | null;
  requiredServices?: string[];
  onboardingComplete?: boolean;
};

type GetToken = () => Promise<string | null>;

async function authedFetch(path: string, getToken: GetToken, init: RequestInit = {}) {
  const token = await getToken();
  if (!token) throw new Error("No active Smitten session");

  return fetch(apiBaseUrl() + path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
      Authorization: "Bearer " + token,
    },
  });
}

export async function bootstrapAccount(getToken: GetToken) {
  const response = await authedFetch("/api/account/bootstrap", getToken, { method: "POST" });
  if (!response.ok) throw new Error("Account bootstrap failed with " + response.status);
  return response.json();
}

export async function loadFavourites(getToken: GetToken): Promise<string[]> {
  const response = await authedFetch("/api/favourites", getToken, { method: "GET" });
  if (!response.ok) throw new Error("Favourite request failed with " + response.status);
  const result = await response.json() as { favourites?: Array<{ vendorId: string }> };
  return Array.isArray(result.favourites) ? result.favourites.map((item) => item.vendorId) : [];
}

export async function updateFavourite(getToken: GetToken, vendorId: string, saved: boolean) {
  const response = await authedFetch("/api/favourites", getToken, {
    method: saved ? "POST" : "DELETE",
    body: JSON.stringify({ vendorId }),
  });
  if (!response.ok) throw new Error("Favourite update failed with " + response.status);
}

export async function loadCustomerPreferences(getToken: GetToken): Promise<MobileCustomerPreferences | null> {
  const response = await authedFetch("/api/customer/preferences", getToken, { method: "GET" });
  if (!response.ok) throw new Error("Preference request failed with " + response.status);
  const result = await response.json() as { profile?: MobileCustomerPreferences | null };
  return result.profile ?? null;
}

export async function patchCustomerPreferences(
  getToken: GetToken,
  preferences: Partial<{
    weddingDate: string;
    weddingLocation: string;
    weddingType: string;
    guestCount: string;
    budgetBand: string;
    weddingStyle: string;
    requiredServices: string[];
  }>,
) {
  const response = await authedFetch("/api/customer/preferences", getToken, {
    method: "PATCH",
    body: JSON.stringify(preferences),
  });
  if (!response.ok) throw new Error("Preference update failed with " + response.status);
  return response.json();
}
