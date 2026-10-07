"use client";
import { useRef, useState, type FormEvent } from "react";
import type { AdminMarketplace } from "@/lib/reviews";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import { ReviewList } from "../../components/ReviewList";
import styles from "../../components/reviews.module.css";

type Selected = { target: "review" | "vendor"; id: string; action: "publish" | "hide" | "restore"; name: string; revision?: number };
export default function AdminMarketplaceClient({ initialMarketplace }: { initialMarketplace: AdminMarketplace }) {
  const reasonField = useRef<HTMLTextAreaElement>(null);
  const [marketplace, setMarketplace] = useState(initialMarketplace);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("pending");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function select(value: Selected) { setSelected(value); setReason(""); setError(""); requestAnimationFrame(() => reasonField.current?.focus()); }
  async function moderate(event: FormEvent) {
    event.preventDefault(); if (!selected || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: selected.target, id: selected.id, action: selected.action, reason, expectedRevision: selected.revision }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || "We couldn’t save this action.");
      setMarketplace(result.marketplace); setSelected(null); setReason(""); setNotice("Marketplace change saved. The action and reason are recorded.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "We couldn’t save this action."); }
    finally { setBusy(false); }
  }
  const reviews = marketplace.reviews.filter((r) => filter === "all" || r.status === filter);
  const vendors = marketplace.vendors.filter((v) => `${v.name} ${v.category} ${v.location}`.toLowerCase().includes(query.toLowerCase()));
  return <main className={styles.workspace}><WorkspaceHeader role="admin" activeSection="marketplace" /><div className={styles.content}>
    <p className="eyebrow">Marketplace oversight</p><h1>Reviews and vendor visibility</h1><p>Approve booking reviews and manage which vendor profiles appear publicly.</p>
    {selected && <section className={styles.section}><h2>{selected.action === "publish" ? "Publish review" : selected.action === "restore" ? "Restore vendor" : `Hide ${selected.target}`}</h2><p>{selected.name}</p>{selected.target === "vendor" && <p>Visibility changes affect discovery and new enquiries. Existing bookings and messages remain accessible to their owners.</p>}
      <form className={styles.form} onSubmit={(event) => void moderate(event)}><label>Reason for this action<textarea ref={reasonField} value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={500} required /></label><div className={styles.actions}><button disabled={busy}>{busy ? "Saving…" : "Confirm action"}</button><button type="button" disabled={busy} onClick={() => setSelected(null)}>Cancel</button></div></form>
    </section>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <section className={styles.section}><h2>Review queue</h2><div className={styles.form}><label>Review status<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="pending">Awaiting approval</option><option value="published">Published</option><option value="hidden">Hidden</option><option value="all">All reviews</option></select></label></div>
      {!reviews.length && <p>No reviews in this queue.</p>}{reviews.map((r) => <div className={styles.card} key={r.id}><strong>{r.vendorName}</strong><ReviewList reviews={[r]} showStatus /><div className={styles.actions}>
        {r.status !== "published" && <button disabled={busy} onClick={() => select({ target: "review", id: r.id, action: "publish", name: `${r.vendorName}: ${r.title}`, revision: r.revision })}>Publish review</button>}
        {r.status !== "hidden" && <button disabled={busy} onClick={() => select({ target: "review", id: r.id, action: "hide", name: `${r.vendorName}: ${r.title}`, revision: r.revision })}>Hide review</button>}
      </div></div>)}<p>Showing up to 200 reviews, with pending reviews first.</p>
    </section>
    <section className={styles.section}><h2>Vendor visibility</h2><div className={styles.form}><label>Find a vendor<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Business, service or location" /></label></div>
      {!vendors.length && <p>No vendors match your search.</p>}{vendors.map((v) => <article className={styles.card} key={v.id}><h3>{v.name}</h3><p>{v.category} · {v.location}</p><div className={styles.meta}><span className={styles.badge}>{v.status === "hidden" ? "Hidden by admin" : v.active ? "Listed" : "Onboarding incomplete"}</span><code>{v.id}</code></div><div className={styles.actions}><button disabled={busy} onClick={() => select({ target: "vendor", id: v.id, action: v.status === "hidden" ? "restore" : "hide", name: v.name })}>{v.status === "hidden" ? "Restore visibility" : "Hide vendor"}</button></div></article>)}<p>Showing the 200 most recently updated vendors.</p>
    </section>
    <section className={styles.section}><h2>Recent admin actions</h2>{!marketplace.events.length && <p>No marketplace actions yet.</p>}{marketplace.events.map((e) => <article className={styles.card} key={e.id}><div className={styles.meta}><strong>{e.action.replace(".", " · ")}</strong><span>{e.actor}</span><time dateTime={e.createdAt}>{new Date(e.createdAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</time></div><p>{e.reason}</p><small>Item: {e.targetId}</small></article>)}</section>
    {notice && <div role="status" className={styles.notice}>{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
  </div></main>;
}
