import { getSql } from "@/db";
import type { vendorProfiles } from "@/db/schema";

type VendorProfileInput = Pick<typeof vendorProfiles.$inferInsert,
  "clerkUserId" | "businessName" | "contactName" | "businessEmail" | "phone" |
  "yearsInBusiness" | "primaryService" | "location" | "travelDistance" |
  "startingPrice" | "instagram" | "about" | "state">;

// Used by profile saves and deployment backfills, never by catalogue reads.
export function vendorListingQuery(clerkUserId: string | null) {
  const sql = getSql();
  return sql`
    INSERT INTO marketplace_vendors (
      id, owner_clerk_user_id, business_name, category, location, state,
      starting_price, currency_code, tier, rating, review_count, image_url,
      styles, match_reason, about, travel_distance, gallery, highlights,
      instagram, response_time, availability, active
    )
    SELECT
      COALESCE(existing.id, 'vendor-' || md5(vp.clerk_user_id)),
      vp.clerk_user_id, vp.business_name,
      CASE vp.primary_service WHEN 'Planning & coordination' THEN 'Planning & décor' WHEN 'Décor & styling' THEN 'Planning & décor' WHEN 'Cakes' THEN 'Cakes & desserts' WHEN 'Music & entertainment' THEN 'Music & DJs' ELSE vp.primary_service END,
      vp.location, vp.state,
      COALESCE(vp.starting_price, 0), vp.currency_code, 'Mid-range', 0, 0,
      '/vendor-placeholder.svg',
      '[]'::jsonb, 'Get to know this vendor and ask about your celebration.',
      COALESCE(vp.about, 'Tell this vendor about your wedding to receive a personalised response.'),
      vp.travel_distance,
      '[]'::jsonb,
      jsonb_build_array(vp.years_in_business, vp.travel_distance),
      vp.instagram, 'Usually replies within 1 business day',
      'Contact vendor to confirm availability', vp.onboarding_complete
    FROM vendor_profiles vp
    LEFT JOIN LATERAL (
      SELECT id FROM marketplace_vendors
      WHERE owner_clerk_user_id = vp.clerk_user_id
      ORDER BY created_at, id LIMIT 1
    ) existing ON true
    WHERE (${clerkUserId}::text IS NULL OR vp.clerk_user_id = ${clerkUserId})
    ON CONFLICT (id) DO UPDATE SET
      business_name = EXCLUDED.business_name,
      category = EXCLUDED.category,
      location = EXCLUDED.location,
      state = EXCLUDED.state,
      starting_price = EXCLUDED.starting_price,
      currency_code = EXCLUDED.currency_code,
      about = EXCLUDED.about,
      travel_distance = EXCLUDED.travel_distance,
      highlights = EXCLUDED.highlights,
      instagram = EXCLUDED.instagram,
      active = EXCLUDED.active,
      updated_at = now()
  `;
}

export async function saveVendorProfileAndListing(profile: VendorProfileInput) {
  const sql = getSql();
  // The listing is published in the same transaction as the profile. A failure
  // rolls both back, and the profile row lock serialises concurrent saves.
  await sql.transaction([
    sql`
      INSERT INTO vendor_profiles (
        clerk_user_id, business_name, contact_name, business_email, phone,
        years_in_business, primary_service, location, travel_distance,
        starting_price, instagram, about, state, onboarding_complete
      ) VALUES (
        ${profile.clerkUserId}, ${profile.businessName}, ${profile.contactName},
        ${profile.businessEmail}, ${profile.phone}, ${profile.yearsInBusiness},
        ${profile.primaryService}, ${profile.location}, ${profile.travelDistance},
        ${profile.startingPrice ?? null}, ${profile.instagram ?? null}, ${profile.about ?? null}, ${profile.state ?? null}, true
      )
      ON CONFLICT (clerk_user_id) DO UPDATE SET
        business_name = EXCLUDED.business_name, contact_name = EXCLUDED.contact_name,
        business_email = EXCLUDED.business_email, phone = EXCLUDED.phone,
        years_in_business = EXCLUDED.years_in_business, primary_service = EXCLUDED.primary_service,
        location = EXCLUDED.location, travel_distance = EXCLUDED.travel_distance,
        starting_price = EXCLUDED.starting_price, instagram = EXCLUDED.instagram,
        about = EXCLUDED.about, state = EXCLUDED.state, onboarding_complete = true, updated_at = now()
    `,
    vendorListingQuery(profile.clerkUserId),
  ]);
}
