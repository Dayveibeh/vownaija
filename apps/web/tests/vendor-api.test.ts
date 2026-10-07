import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { appendPortfolioMedia, archiveOwnedPackage, getOwnedVendor, saveOwnedPackage, updatePortfolioMedia } from "../lib/vendor-workspace";
import { MediaError, readMedia, storeMedia, validateMedia, validatedMediaName, readMediaForm } from "../lib/vendor-media";
import { nairaInput, instagramInput, vendorProfileSchema } from "../lib/vendor-validation";
import { GET as mediaGET } from "../app/api/vendor-media/[name]/route";
import { after, before, test, mock } from "node:test";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { neonConfig } from "@neondatabase/serverless";
import { NextRequest } from "next/server";
import { setupDatabaseSchema } from "../db/setup";
import { seedMarketplace } from "../db/seed";
import { saveVendorProfileAndListing } from "../lib/vendor-listings";
import { listMarketplaceVendors, getMarketplaceVendor } from "../lib/marketplace";
import { GET } from "../app/api/vendors/route";

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
});

after(async () => {
  neonConfig.fetchFunction = originalFetch;
  if (originalUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalUrl;
  await postgres.close();
});

const profile = {
  clerkUserId: "vendor-test-one", businessName: "Beads & Bliss",
  contactName: "Vendor Test", businessEmail: "vendor@example.test", phone: "08000000000",
  yearsInBusiness: "3 years", primaryService: "Bead Stylist", location: "Lagos",
  travelDistance: "Nigeria", startingPrice: "123000", instagram: "beads",
  about: "Handmade bridal beads and accessories for your celebration.",
};

test("fresh deployment creates all tables and batches schema and sample setup", async () => {
  assert.equal(requests.length, 2);
  assert.ok(requests[0].length > 80);
  assert.equal(requests[1].length, 4);
  const rows = await postgres.query<{ count: number }>(
    "SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public'",
  );
  assert.equal(rows.rows[0].count, 24);
  assert.equal((await listMarketplaceVendors()).length, 6);
  assert.ok((await listMarketplaceVendors()).every((vendor) => vendor.reviewCount === 0 && Number(vendor.rating) === 0));
});

test("first and repeated API reads use one SELECT and return the existing contract", async () => {
  for (let requestNumber = 0; requestNumber < 2; requestNumber++) {
    requests.length = 0;
    const response = await GET(new NextRequest("https://smitten.example/api/vendors"));
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.market, "NG");
    assert.equal(data.currency, "NGN");
    assert.equal(data.count, 6);
    assert.ok(Array.isArray(data.vendors[0].styles));
    assert.match(response.headers.get("server-timing") ?? "", /^vendors;dur=\d+(\.\d+)?$/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].length, 1);
    assert.match(requests[0][0].query.trim(), /^select /i);
  }
});

test("redeployment is idempotent and preserves edited sample vendors and packages", async () => {
  await postgres.query("UPDATE marketplace_vendors SET business_name='Edited sample' WHERE id=(SELECT id FROM marketplace_vendors ORDER BY id LIMIT 1)");
  await postgres.query("UPDATE vendor_packages SET price=999 WHERE id=(SELECT id FROM vendor_packages ORDER BY id LIMIT 1)");
  await setupDatabaseSchema();
  await seedMarketplace();
  assert.equal((await postgres.query("SELECT id FROM marketplace_vendors WHERE business_name='Edited sample'")).rows.length, 1);
  assert.equal((await postgres.query("SELECT id FROM vendor_packages WHERE price=999")).rows.length, 1);
  assert.equal((await listMarketplaceVendors()).length, 6);
});

async function createVendorUser(id: string) {
  await postgres.query("INSERT INTO smitten_users (clerk_user_id,email,full_name,role) VALUES ($1,$2,'Test vendor','vendor')", [id, `${id}@example.test`]);
}

test("saving a profile immediately publishes a listing and all search filters work", async () => {
  await createVendorUser(profile.clerkUserId);
  requests.length = 0;
  await saveVendorProfileAndListing(profile);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].length, 2);
  requests.length = 0;
  const response = await GET(new NextRequest("https://smitten.example/api/vendors?category=Bead%20Stylist&location=lagos&minPrice=120000&maxPrice=124000&q=bliss"));
  const data = await response.json();
  assert.equal(data.count, 1);
  assert.equal(data.vendors[0].businessName, "Beads & Bliss");
  assert.equal(data.vendors[0].acceptingEnquiries, true);
  assert.equal(requests.length, 1);
  assert.equal((await listMarketplaceVendors({ minPrice: 124000, query: "bliss" })).length, 0);
});

test("profile edits keep vendor IDs, favourites, custom media and packages", async () => {
  const [vendor] = await listMarketplaceVendors({ query: "bliss" });
  await postgres.query("UPDATE marketplace_vendors SET id='legacy-studio-123456' WHERE id=$1", [vendor.id]);
  vendor.id = "legacy-studio-123456";
  await postgres.query("UPDATE marketplace_vendors SET image_url='custom.jpg',rating=4.25,review_count=7 WHERE id=$1", [vendor.id]);
  await postgres.query("INSERT INTO favourites (clerk_user_id,vendor_id) VALUES ($1,$2)", [profile.clerkUserId, vendor.id]);
  await postgres.query("INSERT INTO vendor_packages (id,vendor_id,title,description,price) VALUES ('custom-package',$1,'Custom','Description',1200)", [vendor.id]);
  await saveVendorProfileAndListing({ ...profile, businessName: "Renamed Studio", startingPrice: "150000" });
  const updated = await getMarketplaceVendor(vendor.id);
  assert.equal(updated?.businessName, "Renamed Studio");
  assert.equal(updated?.startingPrice, "150000.00");
  assert.equal(updated?.imageUrl, "custom.jpg");
  assert.equal(updated?.rating, "4.25");
  assert.equal(updated?.reviewCount, 7);
  assert.equal(updated?.packages[0].id, "custom-package");
  assert.equal((await postgres.query("SELECT vendor_id FROM favourites WHERE vendor_id=$1", [vendor.id])).rows.length, 1);
});

test("deployment backfills legacy IDs and keeps incomplete profiles hidden", async () => {
  const [vendor] = await listMarketplaceVendors({ query: "Renamed" });
  await postgres.query("UPDATE vendor_profiles SET business_name='Backfilled Studio',onboarding_complete=false WHERE clerk_user_id=$1", [profile.clerkUserId]);
  await seedMarketplace();
  assert.equal(await getMarketplaceVendor(vendor.id), null);
  const rows = await postgres.query<{ id: string; business_name: string }>("SELECT id,business_name FROM marketplace_vendors WHERE owner_clerk_user_id=$1", [profile.clerkUserId]);
  assert.equal(rows.rows[0].id, vendor.id);
  assert.equal(rows.rows[0].business_name, "Backfilled Studio");
});

test("failure publishing the listing rolls the profile save back", async () => {
  await postgres.query("ALTER TABLE marketplace_vendors ADD CONSTRAINT test_reject_listing CHECK (business_name <> 'Rejected Studio')");
  try {
    await assert.rejects(saveVendorProfileAndListing({ ...profile, businessName: "Rejected Studio" }));
    const rows = await postgres.query<{ business_name: string; onboarding_complete: boolean }>("SELECT business_name,onboarding_complete FROM vendor_profiles WHERE clerk_user_id=$1", [profile.clerkUserId]);
    assert.equal(rows.rows[0].business_name, "Backfilled Studio");
    assert.equal(rows.rows[0].onboarding_complete, false);
  } finally {
    await postgres.query("ALTER TABLE marketplace_vendors DROP CONSTRAINT test_reject_listing");
  }
});

test("vendors with identical business names get separate listings", async () => {
  await createVendorUser("vendor-test-two");
  await saveVendorProfileAndListing({ ...profile, clerkUserId: "vendor-test-two", businessName: "Same Name" });
  await saveVendorProfileAndListing({ ...profile, businessName: "Same Name" });
  const vendors = await listMarketplaceVendors({ query: "Same Name" });
  assert.equal(vendors.length, 2);
  assert.notEqual(vendors[0].id, vendors[1].id);
});


test("profile edits persist state, normalise categories and keep validation strict", async () => {
  assert.equal(nairaInput.parse("123,456.78"), "123456.78");
  for (const price of ["-500", "1.2.3", "₦500", "1,00", "abc", "", "1000000000000"]) assert.equal(nairaInput.safeParse(price).success, false);
  assert.equal(instagramInput.parse("@beadsandbliss"), "https://www.instagram.com/beadsandbliss");
  assert.equal(instagramInput.parse("instagram.com/beadsandbliss"), "https://instagram.com/beadsandbliss");
  for (const url of ["javascript:alert(1)", "https://instagram.com.evil.test/beads", "https://user:password@instagram.com/beads"]) assert.equal(instagramInput.safeParse(url).success, false);
  const input = { ...profile, state: "Lagos", travelDistance: "Nationwide", instagram: "@beads", primaryService: "Planning & coordination" };
  assert.equal(vendorProfileSchema.safeParse(input).success, true);
  assert.equal(vendorProfileSchema.safeParse({ ...input, state: "Not a state" }).success, false);
  await saveVendorProfileAndListing(input);
  const vendor = await getOwnedVendor(profile.clerkUserId);
  const published = await getMarketplaceVendor(String(vendor?.id));
  assert.equal(published?.state, "Lagos");
  assert.equal(published?.category, "Planning & décor");
  assert.equal((await listMarketplaceVendors({ category: "Planning & décor", query: profile.businessName })).length, 1);
});

test("package creation, editing and archival persist and enforce ownership", async () => {
  const vendor = await getOwnedVendor(profile.clerkUserId);
  const input = { title: "Bridal beads", description: "Custom bridal beads with a fitting", price: "25000", featured: true, displayOrder: 0 };
  const id = await saveOwnedPackage(profile.clerkUserId, input);
  assert.equal((await getMarketplaceVendor(String(vendor?.id)))?.packages.find((item) => item.id === id)?.price, 25000);
  await assert.rejects(saveOwnedPackage("vendor-test-two", { ...input, id, price: "1" }), /NOT_FOUND/);
  await assert.rejects(archiveOwnedPackage("vendor-test-two", id), /NOT_FOUND/);
  await saveOwnedPackage(profile.clerkUserId, { ...input, id, price: "30000", title: "Updated beads" });
  assert.equal((await getMarketplaceVendor(String(vendor?.id)))?.packages.find((item) => item.id === id)?.title, "Updated beads");
  await archiveOwnedPackage(profile.clerkUserId, id);
  assert.equal((await getMarketplaceVendor(String(vendor?.id)))?.packages.some((item) => item.id === id), false);
  assert.equal((await postgres.query<{ active: boolean }>("SELECT active FROM vendor_packages WHERE id=$1", [id])).rows[0].active, false);
  await seedMarketplace();
  assert.equal((await getMarketplaceVendor(String(vendor?.id)))?.packages.some((item) => item.id === id), false);
});

test("portfolio bytes and database links survive reload, enforce ownership, cover and removal", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "smitten-media-test-"));
  const previous = process.env.SMITTEN_MEDIA_DIR;
  process.env.SMITTEN_MEDIA_DIR = directory;
  try {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=", "base64");
    const saved = await storeMedia(new File([png], "unsafe-original-name.png", { type: "image/png" }));
    assert.ok(validatedMediaName(saved.name));
    assert.deepEqual(await readMedia(saved.name), png);
    assert.equal((await mediaGET(new Request(`https://smitten.example${saved.url}`), { params: Promise.resolve({ name: saved.name }) })).status, 404);
    await appendPortfolioMedia(profile.clerkUserId, saved.url, true);
    const vendor = await getOwnedVendor(profile.clerkUserId);
    assert.equal((await getMarketplaceVendor(String(vendor?.id)))?.imageUrl, saved.url);
    assert.ok((await getMarketplaceVendor(String(vendor?.id)))?.gallery.includes(saved.url));
    const response = await mediaGET(new Request(`https://smitten.example${saved.url}`), { params: Promise.resolve({ name: saved.name }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
    await assert.rejects(updatePortfolioMedia("vendor-test-two", saved.url, "cover"), /NOT_FOUND/);
    await assert.rejects(updatePortfolioMedia("vendor-test-two", saved.url, "remove"), /NOT_FOUND/);
    const ranged = await mediaGET(new Request(`https://smitten.example${saved.url}`, { headers: { Range: "bytes=0-7" } }), { params: Promise.resolve({ name: saved.name }) });
    assert.equal(ranged.status, 206);
    assert.deepEqual(Buffer.from(await ranged.arrayBuffer()), png.subarray(0, 8));
    const invalid = await mediaGET(new Request(`https://smitten.example${saved.url}`, { headers: { Range: "bytes=900-999" } }), { params: Promise.resolve({ name: saved.name }) });
    assert.equal(invalid.status, 416);
    await seedMarketplace();
    assert.equal((await getMarketplaceVendor(String(vendor?.id)))?.imageUrl, saved.url);
    await updatePortfolioMedia(profile.clerkUserId, saved.url, "remove");
    assert.equal((await getMarketplaceVendor(String(vendor?.id)))?.gallery.includes(saved.url), false);
    assert.equal((await getMarketplaceVendor(String(vendor?.id)))?.imageUrl, "/vendor-placeholder.svg");
    assert.equal((await mediaGET(new Request(`https://smitten.example${saved.url}`), { params: Promise.resolve({ name: saved.name }) })).status, 404);
    assert.deepEqual(await readMedia(saved.name), png); // removal is recoverable at the storage layer
  } finally {
    if (previous === undefined) delete process.env.SMITTEN_MEDIA_DIR; else process.env.SMITTEN_MEDIA_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test("uploads reject unsupported formats, false MIME, oversize input and unsafe paths", async () => {
  assert.throws(() => validateMedia(Buffer.from("<svg onload='alert(1)'/>"), "image/svg+xml"), MediaError);
  assert.throws(() => validateMedia(Buffer.from([255, 216, 255, 0]), "image/png"), MediaError);
  const oversize = Buffer.alloc(8 * 1024 * 1024 + 1); oversize.set([255, 216, 255]);
  assert.throws(() => validateMedia(oversize, "image/jpeg"), (error: unknown) => error instanceof MediaError && error.status === 413);
  assert.equal(validatedMediaName("../../secret.png"), false);
  await assert.rejects(readMedia("../../secret.png"), /Media not found/);
  await assert.rejects(readMediaForm(new Request("https://smitten.example/upload", { method: "POST", body: "tiny", headers: { "content-length": String(30 * 1024 * 1024) } })), (error: unknown) => error instanceof MediaError && error.status === 413);
  const originalVercel = process.env.VERCEL;
  process.env.VERCEL = "1";
  try { await assert.rejects(storeMedia(new File([Buffer.from([255,216,255])], "image.jpg", { type: "image/jpeg" })), (error: unknown) => error instanceof MediaError && error.status === 503); }
  finally { if (originalVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = originalVercel; }
});

test("concurrent media writes append without losing items and enforce gallery limit", async () => {
  const vendor = await getOwnedVendor("vendor-test-two");
  await Promise.all(Array.from({ length: 6 }, (_, i) => appendPortfolioMedia("vendor-test-two", `/api/vendor-media/test-${i}.jpg`)));
  assert.equal((await getOwnedVendor("vendor-test-two"))?.gallery.length, 6);
  await postgres.query("UPDATE marketplace_vendors SET gallery=$1::jsonb WHERE id=$2", [JSON.stringify(Array.from({ length: 24 }, (_, i) => `https://example.test/${i}.jpg`)), vendor?.id]);
  await assert.rejects(appendPortfolioMedia("vendor-test-two", "/api/vendor-media/too-many.jpg"), /GALLERY_FULL/);
  await assert.rejects(updatePortfolioMedia("vendor-test-two", "https://example.test/file.mp4", "cover"), /IMAGE_COVER_REQUIRED/);
});


test("authenticated API writes reject guests, couples, cross-origin submissions and other owners", async () => {
  let apiUserId: string | null = null;
  const directory = await mkdtemp(path.join(tmpdir(), "smitten-api-media-test-"));
  const previousDirectory = process.env.SMITTEN_MEDIA_DIR;
  process.env.SMITTEN_MEDIA_DIR = directory;
  const clerkMock = mock.module("@clerk/nextjs/server", { namedExports: { auth: async () => ({ userId: apiUserId }), currentUser: async () => null } });
  try {
    const packages = await import("../app/api/vendor-workspace/packages/route");
    const media = await import("../app/api/vendor-workspace/media/route");
    const request = (body: unknown, origin = "https://smitten.example") => new Request("https://smitten.example/api/vendor-workspace/packages", { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) });
    const input = { title: "API package", description: "An API-created service package", price: "35000", featured: false, displayOrder: 0 };
    assert.equal((await packages.POST(request(input))).status, 401);
    assert.equal((await media.POST(request(input))).status, 401);
    apiUserId = "couple-api-test";
    await postgres.query("INSERT INTO smitten_users(clerk_user_id,email,full_name,role) VALUES ($1,$2,'Test couple','couple')", [apiUserId, "api-couple@example.test"]);
    assert.equal((await packages.POST(request(input))).status, 403);
    assert.equal((await media.PATCH(request({ action: "cover", url: "anything" }))).status, 403);
    apiUserId = profile.clerkUserId;
    assert.equal((await packages.POST(request(input, "https://other.example"))).status, 403);
    const { rejectCrossOriginWrite } = await import("../lib/vendor-api-auth");
    assert.equal(rejectCrossOriginWrite(new Request("http://localhost:3000/api/vendor-workspace/media", { headers: { host: "dev.smitten.com.ng", origin: "https://dev.smitten.com.ng" } })), null);
    assert.equal(rejectCrossOriginWrite(new Request("https://smitten.example/api", { headers: { origin: "not-a-url" } }))?.status, 403);
    assert.equal((await packages.POST(request({ ...input, price: "-1" }))).status, 400);
    const saved = await packages.POST(request(input));
    assert.equal(saved.status, 200);
    const { id } = await saved.json();
    apiUserId = "vendor-test-two";
    assert.equal((await packages.POST(request({ ...input, id, price: "1" }))).status, 404);
    assert.equal((await packages.DELETE(request({ id }))).status, 404);
    apiUserId = profile.clerkUserId;
    assert.equal((await packages.DELETE(request({ id }))).status, 200);
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=", "base64");
    const form = new FormData(); form.set("file", new File([png], "cover.png", { type: "image/png" })); form.set("cover", "true");
    const uploaded = await media.POST(new Request("https://smitten.example/api/vendor-workspace/media", { method: "POST", body: form, headers: { origin: "https://smitten.example" } }));
    assert.equal(uploaded.status, 201);
    const { url } = await uploaded.json();
    assert.equal((await getOwnedVendor(profile.clerkUserId))?.image_url, url);
    apiUserId = "vendor-test-two";
    assert.equal((await media.PATCH(request({ url, action: "remove" }))).status, 404);
    apiUserId = profile.clerkUserId;
    assert.equal((await media.PATCH(request({ url, action: "remove" }))).status, 200);
  } finally {
    clerkMock.restore();
    if (previousDirectory === undefined) delete process.env.SMITTEN_MEDIA_DIR; else process.env.SMITTEN_MEDIA_DIR = previousDirectory;
    await rm(directory, { recursive: true, force: true });
  }
});
