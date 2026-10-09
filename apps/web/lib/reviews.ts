import { z } from "zod";
import { getSql } from "@/db";

export const reviewInput = z.object({ rating: z.number().int().min(1).max(5), title: z.string().trim().min(3).max(120), body: z.string().trim().min(20).max(2000) }).strict();
export const moderationInput = z.object({ target: z.enum(["review", "vendor"]), id: z.string().trim().min(1).max(200), action: z.enum(["publish", "hide", "restore"]), reason: z.string().trim().min(5).max(500), expectedRevision: z.number().int().positive().optional() }).strict().refine((v) => v.target === "review" ? v.action !== "restore" && Boolean(v.expectedRevision) : v.action !== "publish", { message: "Choose an action for this item." });
export type ReviewView = { id: string; revision: number; rating: number; title: string; body: string; status: "pending" | "published" | "hidden"; reviewer: string; updatedAt: string };
export type BookingReviewState = { status: string; canComplete: boolean; review: ReviewView | null };
function mapReview(row: Record<string, unknown>): ReviewView {
  return { id: String(row.id), revision: Number(row.revision), rating: Number(row.rating), title: String(row.title), body: String(row.body), status: row.status as ReviewView["status"], reviewer: String(row.reviewer || "Smitten customer"), updatedAt: new Date(String(row.updated_at)).toISOString() };
}

export async function getBookingReviewState(bookingId: string, customerId: string): Promise<BookingReviewState | null> {
  const sql = getSql();
  const [booking] = await sql`SELECT status, (wedding_date IS NULL OR wedding_date <= (now() AT TIME ZONE 'Africa/Lagos')::date) AS due FROM bookings WHERE id=${bookingId} AND customer_clerk_user_id=${customerId}`;
  if (!booking) return null;
  const [review] = await sql`SELECT * FROM booking_reviews WHERE booking_id=${bookingId} AND customer_clerk_user_id=${customerId}`;
  return { status: String(booking.status), canComplete: booking.status === "confirmed" && Boolean(booking.due), review: review ? mapReview(review) : null };
}

export async function completeCustomerBooking(bookingId: string, customerId: string) {
  const sql = getSql();
  const [booking] = await sql`UPDATE bookings SET status='completed',completed_at=COALESCE(completed_at,now()),updated_at=now()
    WHERE id=${bookingId} AND customer_clerk_user_id=${customerId} AND status IN ('confirmed','completed')
    AND (wedding_date IS NULL OR wedding_date <= (now() AT TIME ZONE 'Africa/Lagos')::date) RETURNING id`;
  if (!booking) {
    const state = await getBookingReviewState(bookingId, customerId);
    throw new Error(state ? "BOOKING_NOT_READY" : "ITEM_NOT_FOUND");
  }
  return (await getBookingReviewState(bookingId, customerId))!;
}

function refreshRating(vendorId: string) {
  const sql = getSql();
  return sql`UPDATE marketplace_vendors SET rating=COALESCE((SELECT round(avg(rating),2) FROM booking_reviews WHERE vendor_id=${vendorId} AND status='published'),0),
    review_count=(SELECT count(*) FROM booking_reviews WHERE vendor_id=${vendorId} AND status='published'),updated_at=now() WHERE id=${vendorId}`;
}

export async function saveBookingReview(bookingId: string, customerId: string, input: z.infer<typeof reviewInput>) {
  const parsed = reviewInput.parse(input);
  const sql = getSql();
  const [booking] = await sql`SELECT vendor_id FROM bookings WHERE id=${bookingId} AND customer_clerk_user_id=${customerId} AND status='completed' AND vendor_owner_clerk_user_id<>${customerId}`;
  if (!booking) {
    const state = await getBookingReviewState(bookingId, customerId);
    throw new Error(state ? "BOOKING_NOT_READY" : "ITEM_NOT_FOUND");
  }
  const vendorId = String(booking.vendor_id);
  const results = await sql.transaction([
    sql`SELECT id FROM marketplace_vendors WHERE id=${vendorId} FOR UPDATE`,
    sql`INSERT INTO booking_reviews(id,booking_id,vendor_id,customer_clerk_user_id,rating,title,body)
      SELECT ${crypto.randomUUID()},id,vendor_id,customer_clerk_user_id,${parsed.rating},${parsed.title},${parsed.body}
      FROM bookings WHERE id=${bookingId} AND customer_clerk_user_id=${customerId} AND status='completed' AND vendor_owner_clerk_user_id<>${customerId}
      ON CONFLICT(booking_id) DO UPDATE SET rating=excluded.rating,title=excluded.title,body=excluded.body,status='pending',revision=booking_reviews.revision+1,updated_at=now()
      WHERE booking_reviews.customer_clerk_user_id=${customerId} RETURNING *`,
    refreshRating(vendorId),
  ]);
  if (!results[1][0]) throw new Error("BOOKING_NOT_READY");
  return mapReview(results[1][0]);
}

export async function listPublicReviews(vendorId: string) {
  const sql = getSql();
  const rows = await sql`SELECT r.id,r.revision,r.rating,r.title,r.body,r.status,r.updated_at,split_part(u.full_name,' ',1) AS reviewer
    FROM booking_reviews r JOIN smitten_users u ON u.clerk_user_id=r.customer_clerk_user_id
    JOIN marketplace_vendors v ON v.id=r.vendor_id
    WHERE r.vendor_id=${vendorId} AND r.status='published' AND v.active=true AND v.moderation_status='listed' AND (v.owner_clerk_user_id IS NULL OR EXISTS (SELECT 1 FROM smitten_users owner WHERE owner.clerk_user_id=v.owner_clerk_user_id AND owner.account_status='active'))
    ORDER BY r.updated_at DESC,r.id LIMIT 100`;
  return rows.map(mapReview);
}

export async function listVendorReviews(vendorOwnerId: string) {
  const sql = getSql();
  const rows = await sql`SELECT r.*,split_part(u.full_name,' ',1) AS reviewer FROM booking_reviews r
    JOIN marketplace_vendors v ON v.id=r.vendor_id JOIN smitten_users u ON u.clerk_user_id=r.customer_clerk_user_id
    WHERE v.owner_clerk_user_id=${vendorOwnerId} ORDER BY r.updated_at DESC,r.id LIMIT 200`;
  return rows.map(mapReview);
}

export async function getVendorReviewSummary(vendorOwnerId: string) {
  const [row] = await getSql()`SELECT count(*)::int AS count, round(avg(r.rating),1) AS average FROM booking_reviews r
    JOIN marketplace_vendors v ON v.id=r.vendor_id WHERE v.owner_clerk_user_id=${vendorOwnerId} AND r.status='published'`;
  return { count: Number(row.count), average: row.average === null ? null : Number(row.average).toFixed(1) };
}

export async function getAdminMarketplace() {
  const sql = getSql();
  const [reviews, vendors, events] = await Promise.all([
    sql`SELECT r.*,v.business_name,split_part(u.full_name,' ',1) AS reviewer FROM booking_reviews r JOIN marketplace_vendors v ON v.id=r.vendor_id
      JOIN smitten_users u ON u.clerk_user_id=r.customer_clerk_user_id ORDER BY (r.status='pending') DESC,r.updated_at DESC,r.id LIMIT 200`,
    sql`SELECT id,business_name,category,location,active,moderation_status FROM marketplace_vendors ORDER BY updated_at DESC,id LIMIT 200`,
    sql`SELECT e.id,e.target_id,e.action,e.reason,e.created_at,u.full_name AS actor FROM marketplace_admin_events e JOIN smitten_users u ON u.clerk_user_id=e.actor_clerk_user_id ORDER BY e.created_at DESC,e.id LIMIT 50`,
  ]);
  return {
    reviews: reviews.map((r) => ({ ...mapReview(r), vendorName: String(r.business_name) })),
    vendors: vendors.map((v) => ({ id: String(v.id), name: String(v.business_name), category: String(v.category), location: String(v.location), active: Boolean(v.active), status: String(v.moderation_status) })),
    events: events.map((e) => ({ id: String(e.id), targetId: String(e.target_id), action: String(e.action), reason: String(e.reason), actor: String(e.actor), createdAt: new Date(String(e.created_at)).toISOString() })),
  };
}
export type AdminMarketplace = Awaited<ReturnType<typeof getAdminMarketplace>>;

export async function moderateMarketplace(actorId: string, input: z.infer<typeof moderationInput>) {
  const { target, id, action, reason, expectedRevision } = moderationInput.parse(input);
  const sql = getSql();
  if (target === "vendor") {
    const results = await sql.transaction([
      sql`WITH changed AS (UPDATE marketplace_vendors SET moderation_status=${action === "hide" ? "hidden" : "listed"},updated_at=now() WHERE id=${id} RETURNING id)
        INSERT INTO marketplace_admin_events(id,actor_clerk_user_id,target_id,action,reason) SELECT ${crypto.randomUUID()},${actorId},id,${'vendor.' + action},${reason} FROM changed RETURNING id`,
    ]);
    if (!results[0].length) throw new Error("ITEM_NOT_FOUND");
  } else {
    const [review] = await sql`SELECT vendor_id FROM booking_reviews WHERE id=${id}`;
    if (!review) throw new Error("ITEM_NOT_FOUND");
    const vendorId = String(review.vendor_id);
    const results = await sql.transaction([
      sql`SELECT id FROM marketplace_vendors WHERE id=${vendorId} FOR UPDATE`,
      sql`WITH changed AS (UPDATE booking_reviews SET status=${action === "publish" ? "published" : "hidden"},revision=revision+1,updated_at=now() WHERE id=${id} AND revision=${expectedRevision} RETURNING id)
        INSERT INTO marketplace_admin_events(id,actor_clerk_user_id,target_id,action,reason) SELECT ${crypto.randomUUID()},${actorId},id,${'review.' + action},${reason} FROM changed RETURNING id`,
      refreshRating(vendorId),
    ]);
    if (!results[1].length) throw new Error("REVIEW_CHANGED");
  }
}
