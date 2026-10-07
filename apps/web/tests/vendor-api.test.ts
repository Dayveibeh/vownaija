import assert from "node:assert/strict";
import { after, before, test } from "node:test";
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
          rows: result.rows.map((row) => row.map((value) => {
            if (value === null) return null;
            if (typeof value === "boolean") return value ? "t" : "f";
            if (value instanceof Date) return value.toISOString();
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
  assert.equal(rows.rows[0].count, 20);
  assert.equal((await listMarketplaceVendors()).length, 6);
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
