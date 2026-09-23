import { and, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { coupleVendors, vendorProfileDetails } from "@smitten/shared";
import { ensureDatabaseSchema, getDb, getSql } from "@/db";
import { marketplaceVendors, vendorProfiles } from "@/db/schema";

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

  const onboardedVendors = await getDb().select().from(vendorProfiles);
  for (const profile of onboardedVendors) {
    const [existing] = await getDb().select({ id: marketplaceVendors.id })
      .from(marketplaceVendors)
      .where(eq(marketplaceVendors.ownerClerkUserId, profile.clerkUserId))
      .limit(1);

    const slug = profile.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 52) || "vendor";
    const vendorId = existing?.id ?? `${slug}-${profile.clerkUserId.slice(-6).toLowerCase()}`;
    const startingPrice = profile.startingPrice ? String(profile.startingPrice) : "0";
    const fallbackImage = "https://ikejabird.com/wp-content/uploads/2025/10/2022-02-01-1.jpg";

    await getDb().insert(marketplaceVendors).values({
      id: vendorId,
      ownerClerkUserId: profile.clerkUserId,
      businessName: profile.businessName,
      category: profile.primaryService,
      location: profile.location,
      state: profile.state,
      startingPrice,
      currencyCode: "NGN",
      tier: "New on Smitten",
      rating: "5.00",
      reviewCount: 0,
      imageUrl: fallbackImage,
      styles: [],
      matchReason: "A newly verified Smitten vendor ready to hear about your celebration.",
      about: profile.about ?? "Tell this vendor about your wedding to receive a personalised response.",
      travelDistance: profile.travelDistance,
      gallery: [fallbackImage],
      highlights: ["Verified Smitten vendor", profile.yearsInBusiness, profile.travelDistance],
      instagram: profile.instagram,
      responseTime: "Usually replies within 1 business day",
      availability: "Contact vendor to confirm availability",
      active: profile.onboardingComplete,
    }).onConflictDoUpdate({
      target: marketplaceVendors.id,
      set: {
        ownerClerkUserId: profile.clerkUserId,
        businessName: profile.businessName,
        category: profile.primaryService,
        location: profile.location,
        state: profile.state,
        startingPrice,
        about: profile.about ?? "Tell this vendor about your wedding to receive a personalised response.",
        travelDistance: profile.travelDistance,
        instagram: profile.instagram,
        active: profile.onboardingComplete,
        updatedAt: new Date(),
      },
    });
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
