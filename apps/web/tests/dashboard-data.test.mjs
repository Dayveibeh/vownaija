// From apps/web: node --import tsx --experimental-test-module-mocks --test tests/dashboard-data.test.mjs
import assert from "node:assert/strict";
import { mock, test } from "node:test";

let queryHandler;
let insertHandler;
const queries = [];
const inserts = [];

mock.module(new URL("../db/index.ts", import.meta.url), {
  namedExports: {
    ensureDatabaseSchema: async () => {},
    getSql: () => async (strings, ...values) => {
      const text = strings.join("?").replace(/\s+/g, " ").trim();
      queries.push({ text, values });
      return queryHandler(text, values);
    },
    getDb: () => ({
      insert: () => ({ values: (value) => ({
        onConflictDoUpdate: async (options) => {
          inserts.push({ value, options });
          await insertHandler(value);
        },
      }) }),
    }),
  },
});

const { listAccountQuotes, getQuoteForAccount, loadConversationQuotes } = await import("../lib/quotes.ts");
const { ensureMarketplaceSeed } = await import("../lib/marketplace.ts");
const { coupleVendors } = await import("@smitten/shared");

const quote = (id) => ({
  id, conversation_id: `conversation-${id}`, enquiry_id: `enquiry-${id}`,
  vendor_id: "vendor-a", vendor_name: "Vendor A", customer_name: "Customer A",
  title: `Quote ${id}`, subtotal: "1000", total: "1000", revision: 1,
  status: "sent", sent_at: "2026-10-01T09:00:00Z",
});

test("quote lists batch details without mixing items or losing account restrictions", async () => {
  for (const role of ["couple", "vendor"]) {
    queries.length = 0;
    queryHandler = async (text) => {
      if (text.includes("FROM quotes q")) return [quote("a"), quote("b"), quote("c")];
      if (text.includes("FROM quote_items")) return [
        { id: "b-first", quote_id: "b", title: "B first", quantity: 1, unit_price: "200", line_total: "200" },
        { id: "a-first", quote_id: "a", title: "A first", quantity: 2, unit_price: "300", line_total: "600" },
        { id: "b-second", quote_id: "b", title: "B second", quantity: 1, unit_price: "800", line_total: "800" },
      ];
      if (text.includes("FROM bookings")) return [{ id: "booking-b", quote_id: "b" }];
      throw new Error(`Unexpected query: ${text}`);
    };
    const result = await listAccountQuotes("user-a", role);
    assert.equal(queries.length, 3);
    assert.match(queries[0].text, /customer_clerk_user_id=\?/);
    assert.match(queries[0].text, /vendor_owner_clerk_user_id=\?/);
    assert.deepEqual(queries[0].values, [role, "user-a", role, "user-a"]);
    for (const detail of queries.slice(1)) assert.deepEqual(detail.values, [["a", "b", "c"]]);
    assert.deepEqual(result.map((item) => item.id), ["a", "b", "c"]);
    assert.deepEqual(result[0].items.map((item) => item.id), ["a-first"]);
    assert.deepEqual(result[1].items.map((item) => item.id), ["b-first", "b-second"]);
    assert.equal(result[0].items[0].lineTotal, 600);
    assert.equal(result[1].bookingId, "booking-b");
    assert.equal(result[0].bookingId, null);
    assert.deepEqual(result[2].items, []);
  }
});

test("empty or inaccessible quotes do not fetch any details", async () => {
  queries.length = 0;
  queryHandler = async () => [];
  assert.deepEqual(await listAccountQuotes("user-a", "couple"), []);
  assert.equal(queries.length, 1);
  queries.length = 0;
  assert.equal(await getQuoteForAccount("private-quote", "user-a", "couple"), null);
  assert.equal(queries.length, 1);
  assert.ok(queries[0].values.includes("private-quote"));
  queries.length = 0;
  await assert.rejects(loadConversationQuotes("private-conversation", "user-a", "couple"), /CONVERSATION_NOT_FOUND/);
  assert.equal(queries.length, 1);
});

test("sample seed retries failure, shares concurrent work, and still publishes changed profiles", async () => {
  queries.length = 0;
  inserts.length = 0;
  let failOnce = true;
  let profiles = [];
  queryHandler = async (text) => text.includes("SELECT vp.*") ? profiles : [];
  insertHandler = async () => {
    if (failOnce) {
      failOnce = false;
      throw new Error("temporary database failure");
    }
  };
  await assert.rejects(ensureMarketplaceSeed(), /temporary database failure/);
  inserts.length = 0;
  await Promise.all([ensureMarketplaceSeed(), ensureMarketplaceSeed(), ensureMarketplaceSeed()]);
  assert.equal(inserts.length, coupleVendors.length);
  const seededWriteCount = queries.filter((q) => !q.text.includes("SELECT vp.*")).length;
  assert.ok(seededWriteCount > 0);
  await ensureMarketplaceSeed();
  assert.equal(inserts.length, coupleVendors.length);
  assert.equal(queries.filter((q) => !q.text.includes("SELECT vp.*")).length, seededWriteCount);

  profiles = [{
    clerk_user_id: "user_new_vendor", business_name: "New Beads", primary_service: "Beads",
    location: "Lagos", state: "Lagos", starting_price: "150000", about: "Handmade beads",
    travel_distance: "Nigeria", years_in_business: "3 years", instagram: null,
    onboarding_complete: true, marketplace_id: null,
  }];
  await ensureMarketplaceSeed();
  const published = inserts.at(-1).value;
  assert.equal(published.ownerClerkUserId, "user_new_vendor");
  assert.equal(published.businessName, "New Beads");
  assert.equal(published.startingPrice, "150000");
  assert.equal(published.active, true);
  profiles = [{ ...profiles[0], marketplace_id: published.id, business_name: "Updated Beads", onboarding_complete: false }];
  await ensureMarketplaceSeed();
  assert.equal(inserts.at(-1).value.id, published.id);
  assert.equal(inserts.at(-1).options.set.businessName, "Updated Beads");
  assert.equal(inserts.at(-1).options.set.active, false);
  assert.equal(inserts.length, coupleVendors.length + 2);
  assert.match(queries.find((q) => q.text.includes("SELECT vp.*")).text, /mv.id IS NULL OR vp.updated_at > mv.updated_at/);
});
