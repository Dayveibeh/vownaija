import assert from "node:assert/strict";
import { before, after, test, mock } from "node:test";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { neonConfig } from "@neondatabase/serverless";
import { setupDatabaseSchema } from "../db/setup";
import { seedMarketplace } from "../db/seed";
import { getCustomerPlanning } from "../lib/customer-workspace";
import { saveVendorProfileAndListing } from "../lib/vendor-listings";
import { getOwnedVendor, saveOwnedPackage } from "../lib/vendor-workspace";
import { createEnquiry } from "../lib/messaging";
import { createConversationQuote, respondToQuote, listAccountBookings } from "../lib/quotes";
import { getBookingPaymentSummary } from "../lib/payments";
import { recommendCoupleVendors, coupleVendorFromMarketplaceRecord } from "@smitten/shared";
import { listMarketplaceVendors } from "../lib/marketplace";
import { weddingDateInput } from "../lib/customer-validation";

let actor: string | null = "customer-a";
let failQuery = "";
mock.module("@clerk/nextjs/server", { namedExports: { auth: async () => ({ userId: actor }), currentUser: async () => null } });
const preferences = await import("../app/api/customer/preferences/route");
const budget = await import("../app/api/customer/budget/route");
const checklist = await import("../app/api/customer/checklist/route");
const favourites = await import("../app/api/favourites/route");
const enquiries = await import("../app/api/enquiries/route");
const quotes = await import("../app/api/conversations/[conversationId]/quotes/route");
const responses = await import("../app/api/quotes/[quoteId]/respond/route");
const bookingPayments = await import("../app/api/bookings/[bookingId]/payments/route");

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
  for (const [id,role] of [["customer-a","couple"],["customer-b","couple"],["vendor-a","vendor"]]) await postgres.query("INSERT INTO smitten_users(clerk_user_id,email,full_name,role) VALUES($1,$2,$1,$3)", [id,`${id}@example.test`,role]);
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
const details = { weddingDate: "2027-06-19", weddingLocation: "Ikeja", weddingState: "Lagos", weddingType: "Traditional & white wedding", guestCount: "250 guests", budgetBand: "₦3m–₦7m", budgetCeiling: "5,250,000", weddingStyle: "Modern", requiredServices: ["Bead styling", "Photography"] };
let budgetId = "", taskId = "", vendorId = "", packageId = "";

test("customer preferences preserve exact dates and budget across refresh, matching and partial edits", async () => {
  assert.equal(weddingDateInput.safeParse("2027-02-30").success, false);
  assert.equal(weddingDateInput.safeParse("2027-13").success, false);
  assert.equal(weddingDateInput.safeParse("2028-02-29").success, true);
  const saved = await preferences.PUT(request(details, "PUT")); assert.equal(saved.status, 200);
  const reloaded = await getCustomerPlanning("customer-a");
  assert.equal(reloaded.details.weddingDate, "2027-06-19"); assert.equal(reloaded.details.budgetCeiling, "5250000.00");
  assert.deepEqual(reloaded.details.requiredServices, ["Bead styling", "Photography"]);
  const matchDetails = { ...details, budgetCeiling: undefined };
  assert.equal((await preferences.PUT(request(matchDetails, "PUT"))).status, 200);
  assert.equal((await getCustomerPlanning("customer-a")).details.budgetCeiling, "5250000.00");
  assert.equal((await preferences.PATCH(request({ weddingLocation: "Lekki" }, "PATCH"))).status, 200);
  const response = await preferences.GET(); assert.equal(response.headers.get("cache-control"), "no-store");
  const readProfile = (await response.json()).profile;
  assert.equal(readProfile.weddingDate, "2027-06-19"); assert.equal(readProfile.weddingState, "Lagos");
  assert.equal((await preferences.PATCH(request({ weddingDate: "2027-13" }, "PATCH"))).status, 400);
  assert.equal((await preferences.PATCH(request({ budgetCeiling: "-3" }, "PATCH"))).status, 400);
});

test("budget allocations and checklist tasks persist and survive deployment migrations", async () => {
  const first = await getCustomerPlanning("customer-a"); assert.deepEqual(first.checklist, []); assert.deepEqual(first.budget, []);
  const added = await budget.POST(request({ title: "Photography", amount: "750,000.50" })); assert.equal(added.status, 200);
  budgetId = (await added.json()).item.id;
  const task = await checklist.POST(request({ title: "Request photographer quotes", dueDate: "2027-01-03" })); assert.equal(task.status, 200);
  taskId = (await task.json()).item.id;
  assert.equal((await checklist.PATCH(request({ id: taskId, completed: true }, "PATCH"))).status, 200);
  await setupDatabaseSchema();
  const refreshed = await getCustomerPlanning("customer-a");
  assert.equal(refreshed.budget[0].amount, "750000.50"); assert.equal(refreshed.checklist[0].completed, true); assert.equal(refreshed.checklist[0].dueDate, "2027-01-03");
  assert.equal((await budget.POST(request({ id: budgetId, title: "Photo and video", amount: "900000" }))).status, 200);
  assert.equal((await checklist.POST(request({ id: taskId, title: "Confirm photographer", dueDate: "", completed: false }))).status, 200);
  assert.equal((await checklist.POST(request({ title: "Invalid date", dueDate: "2027-02-30" }))).status, 400);
  assert.equal((await budget.POST(request({ title: "Invalid", amount: "1,23" }))).status, 400);
});

test("guest, vendor, cross-site and cross-customer planning edits are rejected", async () => {
  actor = null; assert.equal((await preferences.GET()).status, 401); assert.equal((await budget.POST(request({ title: "Photo", amount: "1000" }))).status, 401);
  actor = "vendor-a"; assert.equal((await preferences.PUT(request(details, "PUT"))).status, 403);
  actor = "customer-b";
  await postgres.query("INSERT INTO customer_profiles(clerk_user_id) VALUES('customer-b')");
  const { budgetCeiling: unusedCeiling, ...matching } = details; void unusedCeiling;
  assert.equal((await preferences.PUT(request(matching, "PUT"))).status, 200);
  assert.equal((await getCustomerPlanning("customer-b")).details.budgetCeiling, "7000000.00");
  assert.equal((await budget.POST(request({ id: budgetId, title: "Wrong owner", amount: "1" }))).status, 404);
  assert.equal((await budget.DELETE(request({ id: budgetId }, "DELETE"))).status, 404);
  assert.equal((await checklist.PATCH(request({ id: taskId, completed: true }, "PATCH"))).status, 404);
  assert.equal((await checklist.DELETE(request({ id: taskId }, "DELETE"))).status, 404);
  assert.deepEqual((await getCustomerPlanning("customer-b")).budget, []);
  assert.equal((await preferences.PUT(request(details, "PUT", "https://other.example"))).status, 403);
  actor = "customer-a";
  const proxyRequest = new Request("http://localhost:3000/api/customer/preferences", { method: "PATCH", headers: { Origin: "https://smitten.example", Host: "smitten.example", "Content-Type": "application/json" }, body: JSON.stringify({ guestCount: "300 guests" }) });
  assert.equal((await preferences.PATCH(proxyRequest)).status, 200);
});

test("saved vendors remain account-specific after reload and repeat saves are idempotent", async () => {
  const id = "aurora-events-ng";
  actor = "customer-a"; assert.equal((await favourites.POST(request({ vendorId: id }))).status, 201); assert.equal((await favourites.POST(request({ vendorId: id }))).status, 201);
  const saved = await favourites.GET(); assert.equal(saved.headers.get("cache-control"), "no-store"); assert.equal((await saved.json()).favourites.length, 1);
  actor = "customer-b"; assert.deepEqual((await (await favourites.GET()).json()).favourites, []); await favourites.DELETE(request({ vendorId: id }, "DELETE"));
  actor = "customer-a"; assert.equal((await (await favourites.GET()).json()).favourites.length, 1);
  assert.equal((await favourites.POST(request({ vendorId: id }, "POST", "https://other.example"))).status, 403);
  assert.equal((await favourites.DELETE(request({ vendorId: id }, "DELETE"))).status, 200);
});

const enquiryInput = () => ({ vendorId, packageId, weddingDate: "2027-06-19", weddingLocation: "Lagos", contactName: "Customer A", contactEmail: "customer-a@example.test", message: "Please provide a quote for my bridal beads." });
const quoteInput = { title: "Bridal beads", items: [{ title: "Bead styling", quantity: 1, unitPrice: 100000 }], paymentPlan: "deposit" as const, depositType: "percentage" as const, depositValue: 30, validUntil: "2099-01-01" };

test("live vendor discovery leads to an owned enquiry, quote, booking and tracked deposit", async () => {
  await saveVendorProfileAndListing({ clerkUserId: "vendor-a", businessName: "Pilot Beads", contactName: "Vendor A", businessEmail: "vendor-a@example.test", phone: "08000000000", yearsInBusiness: "3", primaryService: "Bead styling", location: "Lagos", state: "Lagos", travelDistance: "Nationwide", startingPrice: "100000", instagram: "", about: "Bridal bead styling for weddings across Lagos." });
  vendorId = String((await getOwnedVendor("vendor-a"))!.id);
  packageId = await saveOwnedPackage("vendor-a", { title: "Bridal beads", description: "Styling and bridal beads", price: "100000", featured: true, displayOrder: 1 });
  const catalogue = await listMarketplaceVendors();
  const matches = recommendCoupleVendors({ location: "Lagos", budgetCeiling: 200000, style: "Modern", services: ["Bead styling"] }, catalogue.map((row) => coupleVendorFromMarketplaceRecord({ ...row, state: row.state || "", tier: row.tier as "Mid-range" })));
  assert.ok(matches.some((m) => m.id === vendorId));
  actor = "customer-a";
  const enquiryResponse = await enquiries.POST(request(enquiryInput())); assert.equal(enquiryResponse.status, 201);
  const enquiry = await enquiryResponse.json(); assert.equal(enquiry.vendorAssigned, true);
  assert.equal((await enquiries.POST(request({ ...enquiryInput(), vendorId: "aurora-events-ng", packageId: undefined }))).status, 404);
  actor = "vendor-a";
  const quoteResponse = await quotes.POST(request(quoteInput), { params: Promise.resolve({ conversationId: enquiry.conversationId }) }); assert.equal(quoteResponse.status, 201);
  const { quote } = await quoteResponse.json(); assert.equal(quote.depositAmount, 30000); assert.equal(quote.items.length, 1);
  actor = "customer-b"; assert.equal((await responses.POST(request({ action: "accept" }), { params: Promise.resolve({ quoteId: quote.id }) })).status, 404);
  actor = "customer-a";
  const accepted = await responses.POST(request({ action: "accept" }), { params: Promise.resolve({ quoteId: quote.id }) }); assert.equal(accepted.status, 200);
  const { booking } = await accepted.json(); assert.equal(booking.total, 100000);
  assert.equal((await responses.POST(request({ action: "accept" }), { params: Promise.resolve({ quoteId: quote.id }) })).status, 409);
  assert.equal((await listAccountBookings("customer-a", "couple")).length, 1); assert.equal((await listAccountBookings("customer-b", "couple")).length, 0);
  const before = await getBookingPaymentSummary(booking.id, "customer-a", "couple"); assert.equal(before?.nextPaymentPurpose, "deposit"); assert.equal(before?.nextPaymentAmount, 30000);
  // Recorded payment fixture only: no external checkout or money movement.
  await postgres.query("INSERT INTO payment_orders(id,booking_id,customer_clerk_user_id,vendor_owner_clerk_user_id,provider_reference,amount,purpose,status,funds_status) VALUES('payment-fixture',$1,'customer-a','vendor-a','test-reference',30000,'deposit','paid','held')", [booking.id]);
  const paymentResponse = await bookingPayments.GET(new Request("https://smitten.example/api/bookings"), { params: Promise.resolve({ bookingId: booking.id }) }); assert.equal(paymentResponse.status, 200);
  const { summary } = await paymentResponse.json(); assert.equal(summary.paid, 30000); assert.equal(summary.outstanding, 70000); assert.equal(summary.nextPaymentPurpose, "balance");
  actor = "customer-b"; assert.equal((await bookingPayments.GET(new Request("https://smitten.example/api/bookings"), { params: Promise.resolve({ bookingId: booking.id }) })).status, 404);
});

test("enquiry and quote failures roll back every related write", async () => {
  const count = async (table: string) => Number((await postgres.query<{ count: number }>(`SELECT count(*)::int count FROM ${table}`)).rows[0].count);
  const enquiryCount = await count("enquiries"), conversationCount = await count("conversations"), messageCount = await count("messages");
  failQuery = "INSERT INTO messages"; await assert.rejects(createEnquiry("customer-a", enquiryInput()));
  assert.equal(await count("enquiries"), enquiryCount); assert.equal(await count("conversations"), conversationCount); assert.equal(await count("messages"), messageCount);
  const enquiry = await createEnquiry("customer-a", enquiryInput());
  const quoteCount = await count("quotes"), itemCount = await count("quote_items");
  failQuery = "INSERT INTO quote_items"; await assert.rejects(createConversationQuote(enquiry.conversationId, "vendor-a", quoteInput));
  assert.equal(await count("quotes"), quoteCount); assert.equal(await count("quote_items"), itemCount);
  const quote = await createConversationQuote(enquiry.conversationId, "vendor-a", quoteInput);
  const bookingCount = await count("bookings");
  failQuery = "INSERT INTO bookings"; await assert.rejects(respondToQuote(quote.id, "customer-a", "accept"));
  assert.equal(await count("bookings"), bookingCount);
  assert.equal((await postgres.query<{ status: string }>("SELECT status FROM quotes WHERE id=$1", [quote.id])).rows[0].status, "sent");
  const attempts = await Promise.allSettled([respondToQuote(quote.id, "customer-a", "accept"), respondToQuote(quote.id, "customer-a", "accept")]);
  assert.equal(attempts.filter((a) => a.status === "fulfilled").length, 1); assert.equal(await count("bookings"), bookingCount + 1);
});

test("customers can remove their own budget and checklist items", async () => {
  actor = "customer-a"; assert.equal((await budget.DELETE(request({ id: budgetId }, "DELETE"))).status, 200); assert.equal((await checklist.DELETE(request({ id: taskId }, "DELETE"))).status, 200);
  const plan = await getCustomerPlanning("customer-a"); assert.deepEqual(plan.budget, []); assert.deepEqual(plan.checklist, []);
});
