import { and, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { getDb, getSql } from "@/db";
import { marketplaceVendors } from "@/db/schema";

export type VendorFilters = {
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
};

export async function listMarketplaceVendors(filters: VendorFilters = {}) {
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
  const [vendor] = await getDb()
    .select()
    .from(marketplaceVendors)
    .where(and(eq(marketplaceVendors.id, vendorId), eq(marketplaceVendors.active, true)))
    .limit(1);
  if (!vendor) return null;
  return { ...vendor, packages: await listVendorPackages(vendorId) };
}

export async function listVendorPackages(vendorId: string) {
  const rows = await getSql()`
    SELECT id, title, description, price, currency_code, featured, display_order
    FROM vendor_packages
    WHERE vendor_id = ${vendorId} AND active = true
    ORDER BY display_order ASC, created_at ASC
  `;

  const packages = rows.map((item) => ({
    id: String(item.id),
    title: String(item.title),
    description: String(item.description),
    price: Number(item.price),
    currencyCode: "NGN" as const,
    featured: Boolean(item.featured),
    displayOrder: Number(item.display_order),
  }));

  return packages;
}
