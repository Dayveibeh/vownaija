import assert from "node:assert/strict";
import { before, beforeEach, after, test, mock } from "node:test";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { neonConfig } from "@neondatabase/serverless";
import { setupDatabaseSchema } from "../db/setup";
import { seedMarketplace } from "../db/seed";
import { saveVendorProfileAndListing } from "../lib/vendor-listings";
import { listMarketplaceVendors, getMarketplaceVendor } from "../lib/marketplace";
import { createEnquiry } from "../lib/messaging";
import { createConversationQuote, respondToQuote } from "../lib/quotes";
import { getAdminOverview, listAdminUsers, listAdminTransactions, userFilters, transactionFilters } from "../lib/admin-workspace";
let actor: string | null = "admin-a", trustedAdmin = true, failQuery = "";
mock.module("@clerk/nextjs/server", { namedExports: {
  auth: async () => ({ userId: actor }),
  currentUser: async () => ({ id: actor, primaryEmailAddress: { emailAddress: `${actor}@example.test` }, privateMetadata: trustedAdmin ? { smitten: { role: "admin" } } : {}, unsafeMetadata: { smitten: { role: "admin" } } }),
} });
const usersApi = await import("../app/api/admin/users/route");
const transactionsApi = await import("../app/api/admin/transactions/route");
const transactionApi = await import("../app/api/admin/transactions/[transactionId]/route");
const financeApi = await import("../app/api/admin/payments/action/route");
const receiptApi = await import("../app/api/payments/[paymentId]/receipt/route");
const budgetApi = await import("../app/api/customer/budget/route");
const vendorApi = await import("../app/api/vendor-workspace/packages/route");
const favouritesApi = await import("../app/api/favourites/route");
const notificationsApi = await import("../app/api/notifications/route");
const sessionApi = await import("../app/api/account/session/route");
const bootstrapApi = await import("../app/api/account/bootstrap/route");
const workspaceApi = await import("../app/api/account/resolve-workspace/route");
const initializeApi = await import("../app/api/payments/initialize/route");
const messagesApi = await import("../app/api/conversations/[conversationId]/messages/route");
const { syncCurrentUserProfile } = await import("../lib/accounts");
beforeEach(() => { actor="admin-a"; trustedAdmin=true; });
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
  for (const [id,role] of [["customer-a","couple"],["customer-b","couple"],["vendor-a","vendor"],["vendor-b","vendor"],["admin-a","admin"],["admin-b","admin"]]) await postgres.query("INSERT INTO smitten_users(clerk_user_id,email,full_name,role) VALUES($1,$2,$1,$3)", [id,`${id}@example.test`,role]);
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


let vendorId = "", bookingId = "";
async function revision(id: string) { return Number((await postgres.query<{admin_revision:number}>("SELECT admin_revision FROM smitten_users WHERE clerk_user_id=$1",[id])).rows[0].admin_revision); }
async function act(id: string, action: string, extras: Record<string,unknown> = {}) {
  return usersApi.POST(request({ userId:id, action, reason:"Reviewed by support after investigation", expectedRevision:await revision(id), ...extras }));
}
const listRequest = (path = "/api/admin/users") => new Request(`https://smitten.example${path}`);
const detailContext = (id: string) => ({ params: Promise.resolve({transactionId:id}) });

test("admin routes require trusted Clerk metadata, active DB admin and same-origin writes",async () => {
  actor=null; assert.equal((await usersApi.GET(listRequest())).status,401); assert.equal((await transactionsApi.GET(listRequest('/api/admin/transactions'))).status,401);
  actor="customer-a"; assert.equal((await usersApi.GET(listRequest())).status,403);
  actor="admin-a"; trustedAdmin=false; assert.equal((await usersApi.GET(listRequest())).status,403); assert.equal((await financeApi.POST(request({action:"refund",paymentOrderId:"missing"}))).status,403);
  assert.equal((await receiptApi.GET(listRequest(),{params:Promise.resolve({paymentId:"missing"})})).status,403);
  trustedAdmin=true; assert.equal((await usersApi.POST(request({userId:"customer-a",action:"suspend",reason:"Valid review reason",expectedRevision:1},"POST","https://evil.example"))).status,403);
  assert.equal((await financeApi.POST(request({action:"refund",paymentOrderId:"missing"},"POST","https://evil.example"))).status,403);
  assert.equal((await usersApi.POST(request({userId:"customer-a",action:"flag",reason:"bad",expectedRevision:1}))).status,400);
  assert.equal((await usersApi.GET(listRequest('/api/admin/users?page=-1'))).status,400);
  assert.equal((await transactionsApi.GET(listRequest('/api/admin/transactions?from=2026-10-10&to=2026-10-01'))).status,400);
});

test("flagging is audited, keeps access, and stale actions cannot overwrite updates",async () => {
  await saveVendorProfileAndListing({ clerkUserId:"vendor-a",businessName:"Safety Beads",contactName:"Vendor A",businessEmail:"vendor-a@example.test",phone:"08000000000",yearsInBusiness:"3",primaryService:"Bead styling",location:"Lagos",state:"Lagos",travelDistance:"Nationwide",startingPrice:"100000",instagram:"",about:"Wedding bead styling across Lagos and Nigeria." });
  vendorId=String((await postgres.query<{id:string}>("SELECT id FROM marketplace_vendors WHERE owner_clerk_user_id='vendor-a'")).rows[0].id);
  const enquiry=await createEnquiry("customer-a",{vendorId,weddingLocation:"Lagos",message:"Please quote for wedding styling."});
  const quote=await createConversationQuote(enquiry.conversationId,"vendor-a",{title:"Wedding beads",items:[{title:"Styling",quantity:1,unitPrice:100000}],paymentPlan:"full"});
  bookingId=(await respondToQuote(quote.id,"customer-a","accept")).booking!.id;
  await postgres.query("INSERT INTO payment_orders(id,booking_id,customer_clerk_user_id,vendor_owner_clerk_user_id,provider_reference,amount,status,funds_status) VALUES('payment-a',$1,'customer-a','vendor-a','SMITTEN-TEST-001',100000,'paid','held')",[bookingId]);
  const oldRevision=await revision("vendor-a"); assert.equal((await act("vendor-a","flag")).status,200);
  const flagged=await listAdminUsers(userFilters.parse({risk:"flagged"})); assert.equal(flagged.total,1); assert.equal(flagged.users[0].status,"active");
  assert.ok(await getMarketplaceVendor(vendorId));
  assert.equal((await act("vendor-a","suspend",{expectedRevision:oldRevision})).status,409);
  assert.equal((await getAdminOverview()).flaggedUsers,1);
  const audit=(await postgres.query<{action:string;reason:string}>("SELECT action,reason FROM marketplace_admin_events WHERE target_id='vendor-a'")).rows;
  assert.equal(audit.length,1); assert.equal(audit[0].action,"user.flag"); assert.match(audit[0].reason,/investigation/);
});

test("suspension blocks existing-session pages, bootstrap and APIs and hides vendor discovery",async () => {
  assert.equal((await act("vendor-a","suspend")).status,200);
  assert.equal(await getMarketplaceVendor(vendorId),null); assert.ok(!(await listMarketplaceVendors()).some(v=>v.id===vendorId));
  await assert.rejects(createEnquiry("customer-b",{vendorId,weddingLocation:"Lagos",message:"Request another quote."}),/VENDOR_NOT_FOUND/);
  actor="vendor-a"; trustedAdmin=false;
  assert.equal((await vendorApi.POST(request({}))).status,403); assert.equal((await favouritesApi.GET()).status,403); assert.equal((await notificationsApi.GET(listRequest())).status,403); assert.equal((await sessionApi.GET()).status,403);
  assert.equal((await bootstrapApi.POST()).status,403); assert.equal((await workspaceApi.POST(request({}))).status,200); assert.equal((await (await workspaceApi.POST(request({}))).json()).destination,"/account/restricted");
  await assert.rejects(syncCurrentUserProfile("vendor"),/ACCOUNT_RESTRICTED/);
  actor="admin-a"; trustedAdmin=true; assert.equal((await act("vendor-a","restore")).status,200);
  const restored=(await listAdminUsers(userFilters.parse({q:"vendor-a@example.test"}))).users[0]; assert.equal(restored.suspicious,true); assert.ok(await getMarketplaceVendor(vendorId));
});

test("removal requires typed email and preserves finance history and independent listing moderation",async () => {
  assert.equal((await act("vendor-a","remove",{confirmation:"wrong@example.test"})).status,409);
  assert.equal((await act("admin-a","suspend")).status,409); assert.equal((await act("admin-b","suspend")).status,409);
  assert.equal((await act("vendor-a","remove",{confirmation:"vendor-a@example.test"})).status,200);
  assert.equal((await postgres.query<{count:number}>("SELECT count(*)::int count FROM payment_orders WHERE id='payment-a'")).rows[0].count,1);
  assert.equal((await postgres.query<{count:number}>("SELECT count(*)::int count FROM bookings WHERE id=$1",[bookingId])).rows[0].count,1);
  actor="vendor-a"; trustedAdmin=false; assert.equal((await vendorApi.POST(request({}))).status,403);
  actor="admin-a"; trustedAdmin=true;
  await postgres.query("UPDATE marketplace_vendors SET moderation_status='hidden' WHERE id=$1",[vendorId]);
  assert.equal((await act("vendor-a","restore")).status,200); assert.equal(await getMarketplaceVendor(vendorId),null);
  await postgres.query("UPDATE marketplace_vendors SET moderation_status='listed' WHERE id=$1",[vendorId]);
  assert.equal((await act("vendor-a","clear_flag")).status,200); assert.equal((await getAdminOverview()).flaggedUsers,0);
});

test("customer suspension blocks planning, messaging and payment operations",async () => {
  assert.equal((await act("customer-a","suspend")).status,200);
  actor="customer-a"; trustedAdmin=false;
  assert.equal((await budgetApi.POST(request({}))).status,403); assert.equal((await initializeApi.POST(request({bookingId}))).status,403);
  assert.equal((await messagesApi.POST(request({body:"Message during suspension"}),{params:Promise.resolve({conversationId:"anything"})})).status,403);
  actor="admin-a"; trustedAdmin=true; assert.equal((await act("customer-a","restore")).status,200);
});

test("user searches are paginated with stable filters and literal wildcard matching",async () => {
  for (let i=0;i<30;i++) await postgres.query("INSERT INTO smitten_users(clerk_user_id,email,full_name,role) VALUES($1,$2,$3,'couple')",[`extra-${i}`,`extra-${i}@example.test`,`Extra Customer ${i}`]);
  const one=await listAdminUsers(userFilters.parse({q:"Extra",role:"couple"})),two=await listAdminUsers(userFilters.parse({q:"Extra",role:"couple",page:2}));
  assert.equal(one.total,30); assert.equal(one.users.length,25); assert.equal(two.users.length,5); assert.equal(new Set([...one.users,...two.users].map(u=>u.id)).size,30);
  assert.equal((await listAdminUsers(userFilters.parse({q:"%"}))).total,0);
  assert.equal((await listAdminUsers(userFilters.parse({q:"' OR true --"}))).total,0);
});

test("transaction filters cover all attempts, with safe detail history and no provider secrets",async () => {
  for(let i=0;i<30;i++) await postgres.query("INSERT INTO payment_orders(id,booking_id,customer_clerk_user_id,vendor_owner_clerk_user_id,provider_reference,amount,status,funds_status,created_at) VALUES($1,$2,'customer-a','vendor-a',$3,1000,'failed','not_received','2026-10-08 10:00:00+00')",[`attempt-${i}`,bookingId,`ATTEMPT-${i}`]);
  const one=await listAdminTransactions(transactionFilters.parse({q:"ATTEMPT",status:"failed",from:"2026-10-08",to:"2026-10-08"})),two=await listAdminTransactions(transactionFilters.parse({q:"ATTEMPT",status:"failed",page:2}));
  assert.equal(one.total,30); assert.equal(one.transactions.length,25); assert.equal(one.amount,"30000.00"); assert.equal(two.transactions.length,5);
  assert.equal((await listAdminTransactions(transactionFilters.parse({from:"2026-10-09",to:"2026-10-09",q:"ATTEMPT"}))).total,0);
  assert.equal((await listAdminTransactions(transactionFilters.parse({status:"paid",funds:"held"}))).transactions[0].id,"payment-a");
  await postgres.query("INSERT INTO payment_events(id,payment_order_id,event_type,payload) VALUES('event-a','payment-a','charge.success',$1)",[JSON.stringify({authorization:{authorization_code:"PRIVATE-CARD-TOKEN"}})]);
  await postgres.query("INSERT INTO payment_cases(id,payment_order_id,booking_id,case_type,reason) VALUES('case-a','payment-a',$1,'dispute','Service delivery disputed')",[bookingId]);
  await postgres.query("INSERT INTO payout_releases(id,payment_order_id,vendor_owner_clerk_user_id,amount,status) VALUES('payout-a','payment-a','vendor-a',100000,'cancelled')");
  const response=await transactionApi.GET(listRequest(),detailContext("payment-a")); assert.equal(response.status,200); assert.equal(response.headers.get("cache-control"),"no-store");
  const detail=await response.json(); assert.equal(detail.events.length,1); assert.equal(detail.cases.length,1); assert.equal(detail.payouts.length,1); assert.ok(!JSON.stringify(detail).includes("PRIVATE-CARD-TOKEN"));
  assert.equal((await transactionApi.GET(listRequest(),detailContext("missing"))).status,404);
  const summary=await getAdminOverview(); assert.equal(summary.transactions,31); assert.equal(summary.paidAmount,"100000.00"); assert.equal(summary.heldAmount,"100000.00"); assert.equal(summary.openCases,1);
});

test("audit failures roll back account changes and deployment schema preserves restrictions",async () => {
  const oldRevision=await revision("customer-b"); failQuery="INSERT INTO marketplace_admin_events";
  assert.equal((await act("customer-b","suspend")).status,500); assert.equal(await revision("customer-b"),oldRevision);
  assert.equal((await act("customer-b","suspend")).status,200);
  await setupDatabaseSchema();
  assert.equal((await listAdminUsers(userFilters.parse({q:"customer-b@example.test"}))).users[0].status,"suspended");
  actor="admin-a"; await postgres.query("UPDATE smitten_users SET account_status='suspended' WHERE clerk_user_id='admin-a'");
  assert.equal((await usersApi.GET(listRequest())).status,403); assert.equal((await financeApi.POST(request({action:"refund",paymentOrderId:"payment-a"}))).status,403);
  await postgres.query("UPDATE smitten_users SET account_status='active' WHERE clerk_user_id='admin-a'");
});
