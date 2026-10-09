"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import type { AdminUser, AdminUsersResult, UserAction, userFilters } from "@/lib/admin-workspace";
import type { z } from "zod";
import styles from "../admin.module.css";
const labels: Record<UserAction,string> = { suspend: "Suspend user", restore: "Restore access", remove: "Remove user", flag: "Flag as suspicious", clear_flag: "Clear suspicious flag" };
export default function AdminUsersClient({ initial, filters, invalidFilters }: { initial: AdminUsersResult; filters: z.infer<typeof userFilters>; invalidFilters: boolean }) {
  const [result, setResult] = useState(initial), [selected, setSelected] = useState<{ user: AdminUser; action: UserAction } | null>(null);
  const [reason, setReason] = useState(""), [confirmation, setConfirmation] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(invalidFilters ? "Some filters were invalid. Showing all users." : ""), [notice, setNotice] = useState("");
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  function href(page: number, base = "/admin/users") { return `${base}?${new URLSearchParams({ ...filters, page: String(page) })}`; }
  function select(user: AdminUser, action: UserAction) { setSelected({ user, action }); setReason(""); setConfirmation(""); setError(""); requestAnimationFrame(() => { reasonRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); reasonRef.current?.focus({ preventScroll: true }); }); }
  async function apply(event: FormEvent) {
    event.preventDefault(); if (!selected || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selected.user.id, action: selected.action, reason, confirmation, expectedRevision: selected.user.revision }) });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 409) { const refreshed = await fetch(href(filters.page,"/api/admin/users"),{cache:"no-store"}); if (refreshed.ok) setResult(await refreshed.json()); setSelected(null); }
        throw new Error(body.message || "We couldn’t save this action.");
      }
      setSelected(null); setNotice(`${labels[selected.action]} saved. The reason is recorded in the activity log.`);
      const refreshed = await fetch(href(filters.page,"/api/admin/users"),{cache:"no-store"});
      if (!refreshed.ok) throw new Error("Action saved. Reload this page to update the user list.");
      setResult(await refreshed.json());
    } catch (failure) { setError(failure instanceof Error ? failure.message : "We couldn’t save this action."); }
    finally { setBusy(false); }
  }
  return <main className={styles.content}><p className="eyebrow">Account management</p><h1>Users</h1><p className={styles.intro}>Manage customer and vendor access. Suspicious flags are internal review notes and do not suspend an account automatically.</p>
    <form action="/admin/users" className={styles.filters}><label>Find a user<input type="search" name="q" defaultValue={filters.q} placeholder="Name, email or user ID" maxLength={120} /></label><label>Role<select name="role" defaultValue={filters.role}><option value="all">All roles</option><option value="couple">Customers</option><option value="vendor">Vendors</option><option value="admin">Admins</option></select></label><label>Access<select name="status" defaultValue={filters.status}><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="removed">Removed</option></select></label><label>Risk<select name="risk" defaultValue={filters.risk}><option value="all">All users</option><option value="flagged">Flagged users</option></select></label><button>Search users</button><Link href="/admin/users">Reset</Link></form>
    {selected && <section className={styles.panel} aria-labelledby="action-heading"><h2 id="action-heading">{labels[selected.action]}</h2><p><strong>{selected.user.name}</strong> · {selected.user.email}</p>
      {selected.action === "remove" ? <p>This removes access to Smitten and hides owned vendor listings. Bookings, payments and audit records are retained. Access can be restored by an admin.</p> : selected.action === "suspend" ? <p>This blocks workspace pages and account actions, including existing sessions, and hides owned vendor listings until access is restored.</p> : selected.action === "restore" ? <p>This restores Smitten access. Any separate vendor visibility restriction or suspicious flag stays in place.</p> : <p>This changes the internal review flag. It does not change account access.</p>}
      <form onSubmit={event => void apply(event)} className={styles.actionForm}><label>Reason<textarea ref={reasonRef} value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={500} required /></label>{selected.action === "remove" && <label>Type {selected.user.email} to confirm<input type="email" autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} required /></label>}<div className={styles.actions}><button disabled={busy || (selected.action === "remove" && confirmation.trim().toLowerCase() !== selected.user.email.toLowerCase())}>{busy ? "Saving…" : labels[selected.action]}</button><button type="button" disabled={busy} onClick={() => setSelected(null)}>Cancel</button></div></form></section>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.tableWrap}><table className={styles.table}><caption>{result.total} matching users · page {result.page}</caption><thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Access and risk</th><th scope="col">History</th><th scope="col">Actions</th></tr></thead><tbody>{result.users.map(user => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email}</small>{user.businessName && <small>{user.businessName}</small>}<small>Joined {new Date(user.createdAt).toLocaleDateString("en-GB",{timeZone:"Africa/Lagos"})}</small></td><td><span className={styles.badge}>{user.role === "couple" ? "Customer" : user.role}</span></td><td><span className={`${styles.badge} ${user.status !== "active" ? styles.blocked : ""}`}>{user.status}</span>{user.suspicious && <p><span className={`${styles.badge} ${styles.warning}`}>Suspicious · review needed</span></p>}</td><td>{user.bookings} bookings<small>{user.payments} transactions</small><Link href={`/admin/transactions?q=${encodeURIComponent(user.email)}`}>View transactions</Link></td><td>{user.role === "admin" ? <span className={styles.muted}>Protected admin</span> : <div className={styles.actions}>{user.status === "active" ? <button disabled={busy} onClick={() => select(user,"suspend")}>Suspend</button> : <button disabled={busy} onClick={() => select(user,"restore")}>Restore access</button>}<button disabled={busy} onClick={() => select(user,user.suspicious ? "clear_flag" : "flag")}>{user.suspicious ? "Clear flag" : "Flag suspicious"}</button>{user.status !== "removed" && <button className={styles.danger} disabled={busy} onClick={() => select(user,"remove")}>Remove</button>}</div>}</td></tr>)}</tbody></table>{!result.users.length && <p style={{padding:18}}>No users match these filters.</p>}</div>
    <nav className={styles.pagination} aria-label="User pages">{filters.page > 1 ? <Link href={href(filters.page-1)}>Previous page</Link> : <span /> }<span>Page {filters.page} · {result.total} users</span>{filters.page*result.pageSize < result.total && <Link href={href(filters.page+1)}>Next page</Link>}</nav>
    {notice && <div className={styles.notice} role="status">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
  </main>;
}
