import { and, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { coupleVendors } from "@smitten/shared";
import { ensureDatabaseSchema, getDb } from "@/db";
import { marketplaceVendors } from "@/db/schema";

export type VendorFilters = {
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
};

export async function ensureMarketplaceSeed() {
  await ensureDatabaseSchema();

  for (const vendor of coupleVendors) {
    await getDb().insert(marketplaceVendors).values({
      id: vendor.id,
      businessName: vendor.name,
      category: vendor.category,
      location: vendor.location,
      state: vendor.state,
      startingPrice: String(vendor.priceMin),
      currencyCode: vendor.currencyCode,
      tier: vendor.tier,
      rating: vendor.rating,
      reviewCount: vendor.reviews,
      imageUrl: vendor.image,
      styles: vendor.style,
      matchReason: vendor.reason,
      active: true,
    }).onConflictDoNothing({ target: marketplaceVendors.id });
  }
}

export async function listMarketplaceVendors(filters: VendorFilters = {}) {
  await ensureMarketplaceSeed();

  const conditions: SQL[] = [eq(marketplaceVendors.active, true)];
  if (filters.category) conditions.push(eq(marketplaceVendors.category, filters.category));
  if (filters.location) {
    conditions.push(or(
      ilike(marketplaceVendors.location, `%${filters.location}%`),
      ilike(marketplaceVendors.state, `%${filters.location}%`),
    )!);
  }
  if (typeof filters.minPrice === "number") conditions.push(gte(marketplaceVendors.startingPrice, String(filters.minPrice)));
  if (typeof filters.maxPrice === "number") conditions.push(lte(marketplaceVendors.startingPrice, String(filters.maxPrice)));
  if (filters.query) {
    conditions.push(or(
      ilike(marketplaceVendors.businessName, `%${filters.query}%`),
      ilike(marketplaceVendors.category, `%${filters.query}%`),
      ilike(marketplaceVendors.location, `%${filters.query}%`),
    )!);
  }

  return getDb().select().from(marketplaceVendors).where(and(...conditions));
}

export async function getMarketplaceVendor(vendorId: string) {
  await ensureMarketplaceSeed();
  const [vendor] = await getDb()
    .select()
    .from(marketplaceVendors)
    .where(and(eq(marketplaceVendors.id, vendorId), eq(marketplaceVendors.active, true)))
    .limit(1);
  return vendor ?? null;
}
