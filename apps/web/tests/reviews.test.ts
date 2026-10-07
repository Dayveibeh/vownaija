import assert from "node:assert/strict";
import { before, after, test, mock } from "node:test";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { neonConfig } from "@neondatabase/serverless";
import { setupDatabaseSchema } from "../db/setup";
import { seedMarketplace } from "../db/seed";
import { createEnquiry } from "../lib/messaging";
import { createConversationQuote, respondToQuote } from "../lib/quotes";
import { getAdminMarketplace, listPublicReviews, listVendorReviews } from "../lib/reviews";
import { getMarketplaceVendor, listMarketplaceVendors } from "../lib/marketplace";
import { isPublishedMedia } from "../lib/vendor-workspace";
import { saveVendorProfileAndListing } from "../lib/vendor-listings";

let actor: string | null = "customer-a";
let trustedAdmin = false;
let failQuery = "";
mock.module("@clerk/nextjs/server", { namedExports: {
  auth: async () => ({ userId: actor }),
  currentUser: async () => ({ id: actor, privateMetadata: trustedAdmin ? { smitten: { role: "admin" } } : {}, unsafeMetadata: { smitten: { role: "admin" } } }),
} });
const reviews = await import("../app/api/bookings/[bookingId]/review/route");
const completion = await import("../app/api/bookings/[bookingId]/complete/route");
const moderation = await import("../app/api/admin/marketplace/route");
const favourites = await import("../app/api/favourites/route");

const originalPublicKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const originalSecretKey = process.env.CLERK_SECRET_KEY;
before(() => { process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "test"; process.env.CLERK_SECRET_KEY = "test"; });
after(() => {
  if (originalPublicKey === undefined) delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalPublicKey;
  if (originalSecretKey === undefined) delete process.env.CLERK_SECRET_KEY; else process.env.CLERK_SECRET_KEY = originalSecretKey;
});
const postgres = new PGlite();
const requests: Array<Array<{ query: string; params: unknown[] }>> = [];
const originalFetch = neonConfig.fetchFunction;
const originalUrl = process.env.DATABASE_URL;

before(async () => {
  // Exercise the actual Neon + Drizzle clients against isolated PostgreSQL,
  // including transaction rollback. Tests never connect to a real Neon project.
  process.env.DATABASE_URL = "postgresql://test:test@isolated.invalid/test";
  neonConfig.fetchFunction = async (_url: string | URL | Request, options?: RequestInit) => {
    const body = JSON.parse(String(options?.body));
    const queries = body.queries ?? [body];
    requests.push(queries);
    const execute = async (db: PGlite | Transaction) => {
      const results = [];
      for (const { query, params } of queries) {
        if (failQuery && query.includes(failQuery)) { failQuery = ""; await db.query("SELECT 1/0"); }
        const result = await db.query<unknown[]>(query, params, { rowMode: "array" });
        results.push({
          fields: result.fields,
          rows: result.rows.map((row) => row.map((value, index) => {
            if (value === null) return null;
            if (typeof value === "boolean") return value ? "t" : "f";
            if (value instanceof Date) return result.fields[index].dataTypeID === 1082 ? value.toISOString().slice(0,10) : value.toISOString();
            if (typeof value === "object") return JSON.stringify(value);
            return String(value);
          })),
          rowCount: result.rowCount ?? result.affectedRows ?? result.rows.length,
          command: result.command,
        });
      }
      return results;
    };
    try {
      const results = body.queries
        ? await postgres.transaction(execute)
        : await execute(postgres);
      return Response.json(body.queries ? { results } : results[0]);
    } catch (error) {
      const failure = error as Error & { code?: string };
      return Response.json({ message: failure.message, code: failure.code }, { status: 400 });
    }
  };
  await setupDatabaseSchema();
  await seedMarketplace();
  for (const [id,role] of [["customer-a","couple"],["customer-b","couple"],["vendor-a","vendor"],["vendor-b","vendor"],["admin-a","admin"]]) await postgres.query("INSERT INTO smitten_users(clerk_user_id,email,full_name,role) VALUES($1,$2,$1,$3)", [id,`${id}@example.test`,role]);
});

after(async () => {
  neonConfig.fetchFunction = originalFetch;
  if (originalUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalUrl;
  await postgres.close();
});

function request(body: unknown, method = "POST", origin = "https://smitten.example") {
  return new Request("https://smitten.example/api/customer", { method, headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
}

let vendorId = "", bookingId = "", reviewId = "";
const context = (id = bookingId) => ({ params: Promise.resolve({ bookingId: id }) });
const reviewBody = { rating: 4, title: "Thoughtful bead styling", body: "Beautiful beads and clear communication throughout our wedding preparations." };
async function state() { return (await (await reviews.GET(new Request("https://smitten.example/api/review"), context())).json()).state; }
async function moderateReview(action: "publish" | "hide", expectedRevision?: number) {
  const current = (await getAdminMarketplace()).reviews.find((r) => r.id === reviewId)!;
  return moderation.POST(request({ target: "review", id: reviewId, action, reason: "Checked against review guidelines", expectedRevision: expectedRevision || current.revision }));
}

test("only the booking customer can confirm delivery, and future or cancelled bookings are excluded", async () => {
  await saveVendorProfileAndListing({ clerkUserId: "vendor-a", businessName: "Reviewed Beads", contactName: "Vendor A", businessEmail: "vendor-a@example.test", phone: "08000000000", yearsInBusiness: "3", primaryService: "Bead styling", location: "Lagos", state: "Lagos", travelDistance: "Nationwide", startingPrice: "100000", instagram: "", about: "Bridal bead styling for weddings across Lagos." });
  vendorId = String((await postgres.query<{id:string}>("SELECT id FROM marketplace_vendors WHERE owner_clerk_user_id='vendor-a'")).rows[0].id);
  const enquiry = await createEnquiry("customer-a", { vendorId, weddingDate: "2099-06-19", weddingLocation: "Lagos", contactName: "Customer A", contactEmail: "customer-a@example.test", message: "Please provide a quote for my bridal beads." });
  const quote = await createConversationQuote(enquiry.conversationId, "vendor-a", { title: "Bridal beads", items: [{ title: "Styling", quantity: 1, unitPrice: 100000 }], paymentPlan: "full" });
  const accepted = await respondToQuote(quote.id, "customer-a", "accept"); bookingId = accepted.booking!.id;
  assert.equal((await postgres.query<{wedding_date:Date}>("SELECT wedding_date FROM bookings WHERE id=$1",[bookingId])).rows[0].wedding_date.toISOString().slice(0,10),"2099-06-19");
  actor = null; assert.equal((await completion.POST(request({ serviceDelivered: true }), context())).status, 401);
  actor = "vendor-a"; assert.equal((await completion.POST(request({ serviceDelivered: true }), context())).status, 403);
  actor = "customer-b"; assert.equal((await completion.POST(request({ serviceDelivered: true }), context())).status, 404);
  actor = "customer-a";
  assert.equal((await completion.POST(request({ serviceDelivered: true }), context())).status, 409);
  assert.equal((await reviews.PUT(request(reviewBody, "PUT"), context())).status, 409);
  await postgres.query("UPDATE bookings SET wedding_date='2026-01-01',status='cancelled' WHERE id=$1", [bookingId]);
  assert.equal((await completion.POST(request({ serviceDelivered: true }), context())).status, 409);
  await postgres.query("UPDATE bookings SET status='confirmed' WHERE id=$1", [bookingId]);
  assert.equal((await completion.POST(request({ serviceDelivered: false }), context())).status, 400);
  assert.equal((await completion.POST(request({ serviceDelivered: true }, "POST", "https://evil.example"), context())).status, 403);
  assert.equal((await completion.POST(request({ serviceDelivered: true }), context())).status, 200);
  assert.equal((await completion.POST(request({ serviceDelivered: true }), context())).status, 200);
  assert.equal((await state()).status, "completed");
  assert.ok((await postgres.query<{completed_at:Date}>("SELECT completed_at FROM bookings WHERE id=$1",[bookingId])).rows[0].completed_at);
  assert.equal(Number((await postgres.query<{count:number}>("SELECT count(*)::int count FROM payment_orders")).rows[0].count),0);
});

test("reviews are unique per booking, bounded, owner-scoped and private until approval", async () => {
  actor = "customer-a";
  for (const input of [{...reviewBody,rating:0},{...reviewBody,rating:6},{...reviewBody,body:"Too short"},{...reviewBody,body:"a".repeat(2001)},{...reviewBody,status:"published"}]) assert.equal((await reviews.PUT(request(input,"PUT"), context())).status,400);
  assert.equal((await reviews.PUT(request(reviewBody,"PUT","https://evil.example"),context())).status,403);
  const saved = await reviews.PUT(request(reviewBody,"PUT"), context()); assert.equal(saved.status,200); reviewId = (await saved.json()).review.id;
  assert.equal((await state()).review.status,"pending"); assert.deepEqual(await listPublicReviews(vendorId),[]);
  const repeated = await Promise.all([reviews.PUT(request(reviewBody,"PUT"),context()), reviews.PUT(request(reviewBody,"PUT"),context())]);
  assert.equal(repeated.every((response)=>response.status===200),true);
  assert.equal(Number((await postgres.query<{count:number}>("SELECT count(*)::int count FROM booking_reviews WHERE booking_id=$1",[bookingId])).rows[0].count),1);
  actor="customer-b"; assert.equal((await reviews.PUT(request(reviewBody,"PUT"),context())).status,404); assert.equal((await reviews.GET(new Request("https://smitten.example"),context())).status,404);
  actor="vendor-a"; assert.equal((await reviews.PUT(request(reviewBody,"PUT"),context())).status,403);
  assert.equal((await listVendorReviews("vendor-a")).length,1); assert.deepEqual(await listVendorReviews("vendor-b"),[]);
});

test("admin actions require fresh trusted metadata, record reasons, and update public ratings atomically", async () => {
  actor="customer-a"; trustedAdmin=false; assert.equal((await moderation.GET()).status,403);
  actor="admin-a"; assert.equal((await moderation.GET()).status,403); // Unsafe metadata + DB role cannot grant access.
  trustedAdmin=true; assert.equal((await moderation.GET()).status,200);
  assert.equal((await moderation.POST(request({ target:"review",id:reviewId,action:"publish",reason:"x" }))).status,400);
  assert.equal((await moderation.POST(request({ target:"vendor",id:vendorId,action:"hide",reason:"Valid reason" },"POST","https://evil.example"))).status,403);
  failQuery="INSERT INTO marketplace_admin_events"; assert.equal((await moderateReview("publish")).status,500);
  assert.deepEqual(await listPublicReviews(vendorId),[]); assert.equal((await getMarketplaceVendor(vendorId))!.reviewCount,0);
  failQuery="UPDATE marketplace_vendors"; assert.equal((await moderateReview("publish")).status,500);
  assert.deepEqual(await listPublicReviews(vendorId),[]); assert.equal((await getAdminMarketplace()).events.length,0);
  assert.equal((await moderateReview("publish")).status,200);
  const publicReview = (await listPublicReviews(vendorId))[0]; assert.equal(publicReview.rating,4); assert.equal(publicReview.reviewer,"customer-a"); assert.equal("customer_clerk_user_id" in publicReview,false); assert.equal("booking_id" in publicReview,false);
  const vendor=await getMarketplaceVendor(vendorId); assert.equal(Number(vendor!.rating),4); assert.equal(vendor!.reviewCount,1);
  assert.equal((await getAdminMarketplace()).events[0].action,"review.publish");
  trustedAdmin=false; assert.equal((await moderateReview("hide")).status,403); trustedAdmin=true;
  assert.equal((await moderateReview("hide")).status,200); assert.deepEqual(await listPublicReviews(vendorId),[]); assert.equal((await getMarketplaceVendor(vendorId))!.reviewCount,0);
});

test("review edits return to moderation and stale approval cannot publish unread changes", async () => {
  actor="admin-a"; trustedAdmin=true; assert.equal((await moderateReview("publish")).status,200);
  const previous=(await getAdminMarketplace()).reviews.find((r)=>r.id===reviewId)!.revision;
  actor="customer-a"; assert.equal((await reviews.PUT(request({...reviewBody,rating:5,title:"Updated feedback"},"PUT"),context())).status,200);
  assert.deepEqual(await listPublicReviews(vendorId),[]); assert.equal((await getMarketplaceVendor(vendorId))!.reviewCount,0);
  actor="admin-a"; assert.equal((await moderateReview("publish",previous)).status,409);
  assert.equal((await moderateReview("publish")).status,200); assert.equal(Number((await getMarketplaceVendor(vendorId))!.rating),5);
});

test("vendor hiding persists across profile edits and schema reruns, blocks discovery and new enquiries, and restores safely", async () => {
  actor="customer-a"; assert.equal((await favourites.POST(request({vendorId}))).status,201);
  const media="/api/vendor-media/11111111-1111-4111-8111-111111111111.jpg";
  await postgres.query("UPDATE marketplace_vendors SET image_url=$1 WHERE id=$2",[media,vendorId]); assert.equal(await isPublishedMedia(media),true);
  actor="admin-a"; trustedAdmin=true;
  assert.equal((await moderation.POST(request({target:"vendor",id:vendorId,action:"hide",reason:"Vendor visibility review"}))).status,200);
  assert.equal(await getMarketplaceVendor(vendorId),null); assert.equal((await listMarketplaceVendors()).some((v)=>v.id===vendorId),false); assert.equal(await isPublishedMedia(media),false); assert.deepEqual(await listPublicReviews(vendorId),[]);
  await assert.rejects(createEnquiry("customer-b",{vendorId,weddingLocation:"Lagos",contactName:"Customer B",contactEmail:"customer-b@example.test",message:"Please provide a wedding quote."}));
  actor="customer-a"; assert.equal((await favourites.POST(request({vendorId}))).status,404); assert.deepEqual((await (await favourites.GET()).json()).favourites,[]); assert.equal((await state()).status,"completed");
  await saveVendorProfileAndListing({ clerkUserId: "vendor-a", businessName: "Reviewed Beads Updated", contactName: "Vendor A", businessEmail: "vendor-a@example.test", phone: "08000000000", yearsInBusiness: "3", primaryService: "Bead styling", location: "Lagos", state: "Lagos", travelDistance: "Nationwide", startingPrice: "100000", instagram: "", about: "Bridal bead styling for weddings across Lagos." });
  await setupDatabaseSchema(); await seedMarketplace(); assert.equal(await getMarketplaceVendor(vendorId),null); assert.equal((await listVendorReviews("vendor-a")).length,1);
  actor="admin-a"; assert.equal((await moderation.POST(request({target:"vendor",id:vendorId,action:"restore",reason:"Visibility review completed"}))).status,200);
  assert.ok(await getMarketplaceVendor(vendorId)); assert.equal((await listPublicReviews(vendorId)).length,1);
  actor="customer-a"; assert.equal((await (await favourites.GET()).json()).favourites.length,1);
});
