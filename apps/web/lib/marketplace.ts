import { and, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { coupleVendors, vendorProfileDetails } from "@smitten/shared";
import { ensureDatabaseSchema, getDb } from "@/db";
import { marketplaceVendors, vendorPackages } from "@/db/schema";

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
      about: details?.about ?? vendor.reason,
      travelDistance: details?.travelDistance ?? "Nigeria",
      gallery: details?.gallery ?? [vendor.image],
      highlights: details?.highlights ?? [],
      instagram: details?.instagram ?? null,
      responseTime: details?.responseTime ?? "Usually replies within 1 business day",
      availability: details?.availability ?? "Contact vendor to confirm availability",
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
        about: details?.about ?? vendor.reason,
        travelDistance: details?.travelDistance ?? "Nigeria",
        gallery: details?.gallery ?? [vendor.image],
        highlights: details?.highlights ?? [],
        instagram: details?.instagram ?? null,
        responseTime: details?.responseTime ?? "Usually replies within 1 business day",
        availability: details?.availability ?? "Contact vendor to confirm availability",
        active: true,
        updatedAt: new Date(),
      },
    });

    for (const item of details?.packages ?? []) {
      await getDb().insert(vendorPackages).values({
        id: item.id,
        vendorId: vendor.id,
        title: item.title,
        description: item.description,
        price: String(item.price),
        currencyCode: item.currencyCode,
        featured: Boolean(item.featured),
        displayOrder: item.displayOrder,
      }).onConflictDoUpdate({
        target: vendorPackages.id,
        set: {
          title: item.title,
          description: item.description,
          price: String(item.price),
          currencyCode: item.currencyCode,
          featured: Boolean(item.featured),
          displayOrder: item.displayOrder,
          updatedAt: new Date(),
        },
      });
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

  const packages = await getDb()
    .select()
    .from(vendorPackages)
    .where(eq(vendorPackages.vendorId, vendorId))
    .orderBy(vendorPackages.displayOrder);

  return {
    ...vendor,
    packages: packages.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: Number(item.price),
      currencyCode: "NGN" as const,
      featured: item.featured,
      displayOrder: item.displayOrder,
    })),
  };
}
