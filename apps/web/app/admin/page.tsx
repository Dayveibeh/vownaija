import Link from "next/link";
import { requireUserRole } from "@/lib/accounts";
import { getAdminOverview } from "@/lib/admin-workspace";
import styles from "./admin.module.css";
export const dynamic = "force-dynamic";
export default async function AdminOverviewPage() {
  await requireUserRole("admin");
  const summary = await getAdminOverview();
  const currency = (amount: string) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(amount));
  return <main className={styles.content}><p className="eyebrow">Smitten administration</p><h1>Your admin workspace</h1><p className={styles.intro}>Manage accounts, investigate suspicious activity, review transactions and keep the marketplace ready for customers.</p>
    <section className={styles.metrics} aria-label="Admin overview">
      <Link className={styles.metric} href="/admin/users"><span>Registered users</span><strong>{summary.totalUsers}</strong><small>{summary.suspendedUsers} suspended · {summary.removedUsers} removed</small></Link>
      <Link className={styles.metric} href="/admin/users?risk=flagged"><span>Flagged for review</span><strong>{summary.flaggedUsers}</strong><small>Internal suspicious-user flags</small></Link>
      <Link className={styles.metric} href="/admin/transactions"><span>Transactions</span><strong>{summary.transactions}</strong><small>{currency(summary.paidAmount)} currently marked paid</small></Link>
      <Link className={styles.metric} href="/admin/payments"><span>Unreleased paid funds</span><strong>{currency(summary.heldAmount)}</strong><small>Held, releasable or disputed · finance controls</small></Link>
    </section>
    <div className={styles.grid}><section className={styles.panel}><h2>Users and account safety</h2><p>Search customers and vendors, suspend access, flag accounts for investigation or remove them from Smitten.</p><Link className={styles.button} href="/admin/users">Manage users</Link></section>
      <section className={styles.panel}><h2>Payments and transactions</h2><p>{summary.openCases} open payment cases. Inspect references, payment status, payout records and event history.</p><div className={styles.actions}><Link className={styles.button} href="/admin/transactions">View transactions</Link><Link className={styles.button} href="/admin/payments">Finance controls</Link></div></section></div>
    <section className={styles.panel}><h2>Marketplace moderation</h2><p>{summary.pendingReviews} reviews awaiting approval. Review feedback and manage vendor visibility.</p><Link className={styles.button} href="/admin/marketplace">Open marketplace controls</Link></section>
    <section className={styles.panel}><h2>Recent account and moderation activity</h2>{!summary.events.length && <p>No admin actions recorded yet.</p>}<ul className={styles.activity}>{summary.events.map(event => <li key={event.id}><strong>{event.action.replace(/[._]/g," ")}</strong> · {event.actor}<p>{event.reason}</p><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })}</time></li>)}</ul><Link href="/admin/activity">View activity log</Link></section>
  </main>;
}
