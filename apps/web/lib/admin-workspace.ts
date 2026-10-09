import { z } from "zod";
import { getSql } from "@/db";

const page = z.coerce.number().int().min(1).max(10000).default(1);
export const userFilters = z.object({ q: z.string().trim().max(120).default(""), role: z.enum(["all", "couple", "vendor", "admin"]).default("all"), status: z.enum(["all", "active", "suspended", "removed"]).default("all"), risk: z.enum(["all", "flagged"]).default("all"), page });
export const transactionFilters = z.object({ q: z.string().trim().max(120).default(""), status: z.enum(["all", "created", "pending", "paid", "failed", "cancelled", "refunded"]).default("all"), funds: z.enum(["all", "not_received", "held", "releasable", "released", "refunded", "disputed"]).default("all"), from: z.preprocess(v => v === "" ? undefined : v, z.iso.date().optional()), to: z.preprocess(v => v === "" ? undefined : v, z.iso.date().optional()), page }).refine(v => !v.from || !v.to || v.from <= v.to, { message: "Choose a valid date range." });
export const userActionInput = z.object({ userId: z.string().trim().min(1).max(200), action: z.enum(["suspend", "restore", "remove", "flag", "clear_flag"]), reason: z.string().trim().min(5).max(500), expectedRevision: z.number().int().positive(), confirmation: z.string().trim().max(320).optional() }).strict();
export type UserAction = z.infer<typeof userActionInput>["action"];
export type AdminUser = { id: string; name: string; email: string; role: string; status: string; suspicious: boolean; revision: number; createdAt: string; businessName: string | null; bookings: number; payments: number };
const iso = (value: unknown) => new Date(String(value)).toISOString();
const search = (value: string) => `%${value.replace(/[\\%_]/g, "\\$&")}%`;
const pageSize = 25;

export async function listAdminUsers(input: z.infer<typeof userFilters>) {
  const f = userFilters.parse(input), sql = getSql(), q = search(f.q);
  const where = sql`(${f.q}='' OR u.email ILIKE ${q} OR u.full_name ILIKE ${q} OR u.clerk_user_id ILIKE ${q})
    AND (${f.role}='all' OR u.role=${f.role}) AND (${f.status}='all' OR u.account_status=${f.status}) AND (${f.risk}='all' OR u.suspicious=true)`;
  const [rows, totals] = await Promise.all([
    sql`SELECT u.*,vp.business_name,
      (SELECT count(*)::int FROM bookings b WHERE b.customer_clerk_user_id=u.clerk_user_id OR b.vendor_owner_clerk_user_id=u.clerk_user_id) AS bookings,
      (SELECT count(*)::int FROM payment_orders p WHERE p.customer_clerk_user_id=u.clerk_user_id OR p.vendor_owner_clerk_user_id=u.clerk_user_id) AS payments
      FROM smitten_users u LEFT JOIN vendor_profiles vp ON vp.clerk_user_id=u.clerk_user_id WHERE ${where}
      ORDER BY u.created_at DESC,u.clerk_user_id LIMIT ${pageSize} OFFSET ${(f.page-1)*pageSize}`,
    sql`SELECT count(*)::int AS total FROM smitten_users u WHERE ${where}`,
  ]);
  return { users: rows.map((u): AdminUser => ({ id: String(u.clerk_user_id), name: String(u.full_name), email: String(u.email), role: String(u.role), status: String(u.account_status), suspicious: Boolean(u.suspicious), revision: Number(u.admin_revision), createdAt: iso(u.created_at), businessName: u.business_name ? String(u.business_name) : null, bookings: Number(u.bookings), payments: Number(u.payments) })), total: Number(totals[0].total), page: f.page, pageSize };
}
export type AdminUsersResult = Awaited<ReturnType<typeof listAdminUsers>>;

export async function administerUser(actorId: string, input: z.infer<typeof userActionInput>) {
  const data = userActionInput.parse(input), sql = getSql();
  if (data.userId === actorId) throw new Error("ADMIN_PROTECTED");
  const [target] = await sql`SELECT email,role,account_status,admin_revision FROM smitten_users WHERE clerk_user_id=${data.userId}`;
  if (!target) throw new Error("ITEM_NOT_FOUND");
  if (target.role === "admin") throw new Error("ADMIN_PROTECTED");
  if (data.action === "remove" && data.confirmation?.toLowerCase() !== String(target.email).toLowerCase()) throw new Error("CONFIRMATION_REQUIRED");
  const results = await sql.transaction([
    sql`WITH changed AS (
      UPDATE smitten_users SET
        account_status=CASE WHEN ${data.action}='suspend' THEN 'suspended' WHEN ${data.action}='remove' THEN 'removed' WHEN ${data.action}='restore' THEN 'active' ELSE account_status END,
        suspicious=CASE WHEN ${data.action}='flag' THEN true WHEN ${data.action}='clear_flag' THEN false ELSE suspicious END,
        admin_revision=admin_revision+1,updated_at=now()
      WHERE clerk_user_id=${data.userId} AND clerk_user_id<>${actorId} AND role<>'admin' AND admin_revision=${data.expectedRevision}
        AND (${data.action}<>'remove' OR lower(email)=lower(${data.confirmation || ''}))
        AND ((${data.action}='suspend' AND account_status='active') OR (${data.action}='restore' AND account_status<>'active')
          OR (${data.action}='remove' AND account_status<>'removed') OR (${data.action}='flag' AND suspicious=false) OR (${data.action}='clear_flag' AND suspicious=true))
      RETURNING clerk_user_id
    ) INSERT INTO marketplace_admin_events(id,actor_clerk_user_id,target_id,action,reason)
      SELECT ${crypto.randomUUID()},${actorId},clerk_user_id,${'user.'+data.action},${data.reason} FROM changed RETURNING id`,
  ]);
  if (!results[0].length) throw new Error("USER_CHANGED");
}

export async function getAdminOverview() {
  const sql = getSql();
  const [[users], [finance], [work], events] = await Promise.all([
    sql`SELECT count(*)::int AS total,count(*) FILTER (WHERE account_status='suspended')::int AS suspended,count(*) FILTER (WHERE account_status='removed')::int AS removed,count(*) FILTER (WHERE suspicious=true)::int AS flagged FROM smitten_users`,
    sql`SELECT count(*)::int AS transactions,COALESCE(sum(amount) FILTER (WHERE status='paid'),0)::text AS paid,COALESCE(sum(amount) FILTER (WHERE status='paid' AND funds_status IN ('held','releasable','disputed')),0)::text AS held FROM payment_orders`,
    sql`SELECT (SELECT count(*)::int FROM booking_reviews WHERE status='pending') AS reviews,(SELECT count(*)::int FROM payment_cases WHERE status IN ('open','processing','needs_attention')) AS cases`,
    listAdminActivity(12),
  ]);
  return { totalUsers: Number(users.total), suspendedUsers: Number(users.suspended), removedUsers: Number(users.removed), flaggedUsers: Number(users.flagged), transactions: Number(finance.transactions), paidAmount: String(finance.paid), heldAmount: String(finance.held), pendingReviews: Number(work.reviews), openCases: Number(work.cases), events };
}
export async function listAdminActivity(limit = 100) {
  const rows = await getSql()`SELECT e.id,e.action,e.target_id,e.reason,e.created_at,u.full_name AS actor FROM marketplace_admin_events e JOIN smitten_users u ON u.clerk_user_id=e.actor_clerk_user_id ORDER BY e.created_at DESC,e.id LIMIT ${Math.min(100,Math.max(1,limit))}`;
  return rows.map(e => ({ id: String(e.id), action: String(e.action), targetId: String(e.target_id), reason: String(e.reason), actor: String(e.actor), createdAt: iso(e.created_at) }));
}
export type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;

const transactionSelect = () => getSql()`SELECT p.id,p.booking_id,p.provider,p.provider_reference,p.amount::text,p.currency_code,p.status,p.funds_status,p.purpose,p.created_at,p.provider_paid_at,
  u.full_name AS customer_name,u.email AS customer_email,u.suspicious AS customer_flagged,v.business_name AS vendor_name,owner.email AS vendor_email,owner.suspicious AS vendor_flagged,b.service_summary
  FROM payment_orders p JOIN bookings b ON b.id=p.booking_id JOIN smitten_users u ON u.clerk_user_id=p.customer_clerk_user_id
  JOIN smitten_users owner ON owner.clerk_user_id=p.vendor_owner_clerk_user_id JOIN marketplace_vendors v ON v.id=b.vendor_id`;
function transactionView(p: Record<string, unknown>) {
  return { id: String(p.id), bookingId: String(p.booking_id), reference: String(p.provider_reference), provider: String(p.provider), amount: String(p.amount), currency: String(p.currency_code), status: String(p.status), fundsStatus: String(p.funds_status), purpose: String(p.purpose), customer: String(p.customer_name), customerEmail: String(p.customer_email), customerFlagged: Boolean(p.customer_flagged), vendor: String(p.vendor_name), vendorEmail: String(p.vendor_email), vendorFlagged: Boolean(p.vendor_flagged), service: String(p.service_summary), createdAt: iso(p.created_at), paidAt: p.provider_paid_at ? iso(p.provider_paid_at) : null };
}
export async function listAdminTransactions(input: z.infer<typeof transactionFilters>) {
  const f = transactionFilters.parse(input), sql = getSql(), q = search(f.q);
  const where = sql`(${f.q}='' OR p.provider_reference ILIKE ${q} OR p.id ILIKE ${q} OR u.email ILIKE ${q} OR u.full_name ILIKE ${q} OR owner.email ILIKE ${q} OR v.business_name ILIKE ${q})
    AND (${f.status}='all' OR p.status=${f.status}) AND (${f.funds}='all' OR p.funds_status=${f.funds})
    AND (${f.from || null}::date IS NULL OR p.created_at >= (${f.from || null}::date::timestamp AT TIME ZONE 'Africa/Lagos'))
    AND (${f.to || null}::date IS NULL OR p.created_at < ((${f.to || null}::date+1)::timestamp AT TIME ZONE 'Africa/Lagos'))`;
  const [rows, totals] = await Promise.all([
    sql`${transactionSelect()} WHERE ${where} ORDER BY p.created_at DESC,p.id LIMIT ${pageSize} OFFSET ${(f.page-1)*pageSize}`,
    sql`SELECT count(*)::int AS total,COALESCE(sum(p.amount),0)::text AS amount FROM payment_orders p JOIN bookings b ON b.id=p.booking_id
      JOIN smitten_users u ON u.clerk_user_id=p.customer_clerk_user_id JOIN smitten_users owner ON owner.clerk_user_id=p.vendor_owner_clerk_user_id JOIN marketplace_vendors v ON v.id=b.vendor_id WHERE ${where}`,
  ]);
  return { transactions: rows.map(transactionView), total: Number(totals[0].total), amount: String(totals[0].amount), page: f.page, pageSize };
}
export type AdminTransactionsResult = Awaited<ReturnType<typeof listAdminTransactions>>;
export async function getAdminTransaction(id: string) {
  const sql = getSql(), [row] = await sql`${transactionSelect()} WHERE p.id=${id}`;
  if (!row) return null;
  const [events, cases, payouts] = await Promise.all([
    sql`SELECT id,event_type,created_at FROM payment_events WHERE payment_order_id=${id} ORDER BY created_at DESC,id LIMIT 100`,
    sql`SELECT id,case_type,status,reason,resolved_at,created_at FROM payment_cases WHERE payment_order_id=${id} ORDER BY created_at DESC,id LIMIT 50`,
    sql`SELECT id,status,amount::text,created_at FROM payout_releases WHERE payment_order_id=${id} ORDER BY created_at DESC,id LIMIT 50`,
  ]);
  // Provider payloads, authorization URLs and bank details are deliberately absent.
  return { transaction: transactionView(row), events: events.map(e => ({ id: String(e.id), type: String(e.event_type), createdAt: iso(e.created_at) })), cases: cases.map(c => ({ id: String(c.id), type: String(c.case_type), status: String(c.status), reason: String(c.reason || ""), resolvedAt: c.resolved_at ? iso(c.resolved_at) : null, createdAt: iso(c.created_at) })), payouts: payouts.map(p => ({ id: String(p.id), status: String(p.status), amount: String(p.amount), createdAt: iso(p.created_at) })) };
}
export type AdminTransactionDetail = NonNullable<Awaited<ReturnType<typeof getAdminTransaction>>>;
