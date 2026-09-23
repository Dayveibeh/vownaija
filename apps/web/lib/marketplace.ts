import { and, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { coupleVendors, vendorProfileDetails } from "@smitten/shared";
import { ensureDatabaseSchema, getDb, getSql } from "@/db";
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
  const sql = getSql();

  for (const vendor of coupleVendors) {
    const details = vendorProfileDetails[vendor.id];

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
    }).onConflictDoUpdate({
      target: marketplaceVendors.id,
      set: {
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
        updatedAt: new Date(),
      },
    });

    const about = details?.about ?? vendor.reason;
    const travelDistance = details?.travelDistance ?? "Nigeria";
    const gallery = JSON.stringify(details?.gallery ?? [vendor.image]);
    const highlights = JSON.stringify(details?.highlights ?? []);
    const instagram = details?.instagram ?? null;
    const responseTime = details?.responseTime ?? "Usually replies within 1 business day";
    const availability = details?.availability ?? "Contact vendor to confirm availability";

    await sql`
      UPDATE marketplace_vendors
      SET
        about = ${about},
        travel_distance = ${travelDistance},
        gallery = ${gallery}::jsonb,
        highlights = ${highlights}::jsonb,
        instagram = ${instagram},
        response_time = ${responseTime},
        availability = ${availability},
        updated_at = now()
      WHERE id = ${vendor.id}
    `;

    for (const item of details?.packages ?? []) {
      await sql`
        INSERT INTO vendor_packages (
          id, vendor_id, title, description, price, currency_code, featured, display_order
        ) VALUES (
          ${item.id}, ${vendor.id}, ${item.title}, ${item.description},
          ${item.price}, ${item.currencyCode}, ${Boolean(item.featured)}, ${item.displayOrder}
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          currency_code = EXCLUDED.currency_code,
          featured = EXCLUDED.featured,
          display_order = EXCLUDED.display_order,
          updated_at = now()
      `;
    }
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
  if (!vendor) return null;

  const rows = await getSql()`
    SELECT id, title, description, price, currency_code, featured, display_order
    FROM vendor_packages
    WHERE vendor_id = ${vendorId}
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

  return { ...vendor, packages };
}
