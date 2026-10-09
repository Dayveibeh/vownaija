import { getSql } from "@/db";
import type { VendorPackageInput } from "./vendor-validation";

export async function getOwnedVendor(userId: string) {
  const rows = await getSql()`SELECT * FROM marketplace_vendors WHERE owner_clerk_user_id=${userId} ORDER BY created_at,id LIMIT 1`;
  return rows[0] ?? null;
}

export async function saveOwnedPackage(userId: string, input: VendorPackageInput) {
  const sql = getSql();
  const id = input.id ?? crypto.randomUUID();
  const rows = input.id ? await sql`
    UPDATE vendor_packages p SET title=${input.title},description=${input.description},price=${input.price},
      featured=${input.featured},display_order=${input.displayOrder},updated_at=now()
    FROM marketplace_vendors v WHERE p.id=${id} AND p.vendor_id=v.id AND v.owner_clerk_user_id=${userId} AND p.active=true
    RETURNING p.id
  ` : await sql`
    INSERT INTO vendor_packages(id,vendor_id,title,description,price,featured,display_order)
    SELECT ${id},v.id,${input.title},${input.description},${input.price},${input.featured},${input.displayOrder}
    FROM marketplace_vendors v WHERE v.id=(SELECT id FROM marketplace_vendors WHERE owner_clerk_user_id=${userId} ORDER BY created_at,id LIMIT 1)
    RETURNING id
  `;
  if (!rows.length) throw new Error("NOT_FOUND");
  return String(rows[0].id);
}

export async function archiveOwnedPackage(userId: string, id: string) {
  const rows = await getSql()`
    UPDATE vendor_packages p SET active=false,updated_at=now() FROM marketplace_vendors v
    WHERE p.id=${id} AND p.vendor_id=v.id AND v.owner_clerk_user_id=${userId} RETURNING p.id
  `;
  if (!rows.length) throw new Error("NOT_FOUND");
}

export async function appendPortfolioMedia(userId: string, url: string, cover = false) {
  const rows = await getSql()`
    UPDATE marketplace_vendors SET gallery=gallery || jsonb_build_array(${url}::text),
      image_url=CASE WHEN ${cover} OR image_url='/vendor-placeholder.svg' AND ${!url.endsWith(".mp4")} THEN ${url} ELSE image_url END,
      updated_at=now()
    WHERE id=(SELECT id FROM marketplace_vendors WHERE owner_clerk_user_id=${userId} ORDER BY created_at,id LIMIT 1)
      AND jsonb_array_length(gallery)<24 RETURNING id
  `;
  if (!rows.length) throw new Error("GALLERY_FULL");
}

export async function updatePortfolioMedia(userId: string, url: string, action: "cover" | "remove") {
  if (action === "cover" && url.endsWith(".mp4")) throw new Error("IMAGE_COVER_REQUIRED");
  const rows = action === "cover" ? await getSql()`
    UPDATE marketplace_vendors SET image_url=${url},updated_at=now()
    WHERE owner_clerk_user_id=${userId} AND gallery @> ${JSON.stringify([url])}::jsonb RETURNING id
  ` : await getSql()`
    UPDATE marketplace_vendors SET gallery=gallery - ${url},
      image_url=CASE WHEN image_url=${url} THEN COALESCE((SELECT value FROM jsonb_array_elements_text(gallery - ${url}) WHERE value NOT LIKE '%.mp4' LIMIT 1),'/vendor-placeholder.svg') ELSE image_url END,
      updated_at=now()
    WHERE owner_clerk_user_id=${userId} AND gallery @> ${JSON.stringify([url])}::jsonb RETURNING id
  `;
  if (!rows.length) throw new Error("NOT_FOUND");
}

export async function isPublishedMedia(url: string) {
  const rows = await getSql()`SELECT id FROM marketplace_vendors WHERE active=true AND moderation_status='listed' AND (owner_clerk_user_id IS NULL OR EXISTS (SELECT 1 FROM smitten_users owner WHERE owner.clerk_user_id=marketplace_vendors.owner_clerk_user_id AND owner.account_status='active')) AND (image_url=${url} OR gallery @> ${JSON.stringify([url])}::jsonb) LIMIT 1`;
  return Boolean(rows.length);
}
