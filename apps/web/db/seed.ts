import { coupleVendors, vendorProfileDetails } from "@smitten/shared";
import { getSql } from "./index";
import { vendorListingQuery } from "@/lib/vendor-listings";

export async function seedMarketplace() {
  const sql = getSql();
  const vendors = coupleVendors.map((vendor) => {
    const details = vendorProfileDetails[vendor.id];
    return {
      id: vendor.id, business_name: vendor.name, category: vendor.category,
      location: vendor.location, state: vendor.state, starting_price: vendor.priceMin,
      currency_code: vendor.currencyCode, tier: vendor.tier, rating: vendor.rating,
      review_count: vendor.reviews, image_url: vendor.image, styles: vendor.style,
      match_reason: vendor.reason, about: details?.about ?? vendor.reason,
      travel_distance: details?.travelDistance ?? "Nigeria",
      gallery: details?.gallery ?? [vendor.image], highlights: details?.highlights ?? [],
      instagram: details?.instagram ?? null,
      response_time: details?.responseTime ?? "Usually replies within 1 business day",
      availability: details?.availability ?? "Contact vendor to confirm availability",
    };
  });
  const packages = coupleVendors.flatMap((vendor) =>
    (vendorProfileDetails[vendor.id]?.packages ?? []).map((item) => ({
      id: item.id, vendor_id: vendor.id, title: item.title, description: item.description,
      price: item.price, currency_code: item.currencyCode,
      featured: Boolean(item.featured), display_order: item.displayOrder,
    })),
  );

  // Insert missing samples only. Redeployments preserve edited catalogue data.
  // Seed vendors before packages and backfill existing profiles atomically.
  await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(1936554356)`,
    sql`
      INSERT INTO marketplace_vendors (
        id, business_name, category, location, state, starting_price, currency_code,
        tier, rating, review_count, image_url, styles, match_reason, about,
        travel_distance, gallery, highlights, instagram, response_time, availability
      ) SELECT * FROM jsonb_to_recordset(${JSON.stringify(vendors)}::jsonb) AS v(
        id text, business_name text, category text, location text, state text,
        starting_price numeric, currency_code text, tier text, rating numeric,
        review_count integer, image_url text, styles jsonb, match_reason text,
        about text, travel_distance text, gallery jsonb, highlights jsonb,
        instagram text, response_time text, availability text
      ) ON CONFLICT (id) DO NOTHING
    `,
    sql`
      INSERT INTO vendor_packages (
        id, vendor_id, title, description, price, currency_code, featured, display_order
      ) SELECT * FROM jsonb_to_recordset(${JSON.stringify(packages)}::jsonb) AS p(
        id text, vendor_id text, title text, description text, price numeric,
        currency_code text, featured boolean, display_order integer
      ) ON CONFLICT (id) DO NOTHING
    `,
    vendorListingQuery(null),
  ]);
}
