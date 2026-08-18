"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { ArrowRight, Bell, CalendarDays, ChevronRight, CircleDollarSign, FileText, Heart, LayoutDashboard, Mail, MapPin, Menu, MessageSquare, Search, Settings, Sparkles, Star, UsersRound, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";
import { coupleVendors } from "../vendor-data";
import { Brand } from "../../components/Brand";

export default function CoupleDashboardClient({ profile }: { profile: { fullName: string; email: string } }) {
  const { signOut } = useClerk();
  const [mobileNav, setMobileNav] = useState(false);
  const [saved, setSaved] = useState(coupleVendors.slice(2, 5).map((vendor) => vendor.name));
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const firstName = profile.fullName.split(/\s+/)[0] || "there";
  const initials = profile.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "SM";

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function toggleSaved(name: string) {
    setSaved((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  function showNotice(message: string) {
    setNotice(message);
    setMobileNav(false);
  }

  function goTo(id: string, message: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    showNotice(message);
  }

  return (
    <main className="couple-dashboard-shell">
      <aside className={mobileNav ? "couple-sidebar open" : "couple-sidebar"}>
        <div className="couple-sidebar-brand"><Brand /><button onClick={() => setMobileNav(false)}><X /></button></div>
        <div className="wedding-countdown"><span><CalendarDays /></span><p><strong>Amara & Tunde</strong><small>18 December 2026</small></p><b>127 days</b></div>
        <nav><small>My wedding</small><button className="active" onClick={() => goTo("couple-overview", "Overview opened")}><LayoutDashboard /> Overview</button><Link href="/couples/match"><Sparkles /> AI matches <span>New</span></Link><button onClick={() => goTo("couple-shortlist", "Saved vendors opened")}><Heart /> Saved vendors <b>{saved.length}</b></button><button onClick={() => goTo("couple-activity", "Quotes opened")}><FileText /> Quotes</button><button onClick={() => goTo("couple-activity", "Messages opened")}><MessageSquare /> Messages <b>2</b></button><small>Planning</small><button onClick={() => goTo("couple-budget", "Budget opened")}><WalletCards /> Budget</button><button onClick={() => goTo("couple-planning", "Guest planning opened")}><UsersRound /> Guest list</button><button onClick={() => showNotice("Wedding settings opened")}><Settings /> Wedding settings</button></nav>
        <div className="couple-sidebar-bottom"><span>{initials}</span><p><strong>{profile.fullName}</strong><small>{profile.email}</small></p><button onClick={() => signOut({ redirectUrl: "/" })} aria-label="Sign out" title="Sign out">↗</button></div>
      </aside>

      <section className="couple-dashboard-main">
        <header className="couple-dashboard-top"><button className="couple-menu" onClick={() => setMobileNav(true)}><Menu /></button><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") showNotice(query ? `Searching for “${query}”` : "Type something to search"); }} placeholder="Search vendors, quotes or messages…" /></label><div><Link href="/">Browse marketplace</Link><button onClick={() => showNotice("You have 2 unread messages")} aria-label="Open notifications"><Bell /><span /></button><span>{initials}</span></div></header>
        <div className="couple-dashboard-content" id="couple-overview">
          <div className="couple-dash-heading"><div><p>Thursday, 13 August</p><h1>Good afternoon, {firstName}</h1><span>You’re making lovely progress. Here’s what’s next for your wedding.</span></div><Link href="/" className="button button-primary">Find vendors <Search size={16} /></Link></div>

          <section className="couple-ai-banner"><div className="couple-ai-icon"><Sparkles /></div><div><p>Smitten AI recommendations</p><h2>Your personalised vendor shortlist is ready</h2><span>We found 4 strong matches for your Lagos wedding and ₦1m–₦3m vendor budget.</span></div><Link href="/couples/match">View my matches <ArrowRight /></Link><div className="mini-matches"><span>AE</span><span>LL</span><span>DC</span><span>+1</span></div></section>

          <div className="couple-stat-grid"><article><span className="coral"><Heart /></span><div><p>Saved vendors</p><strong>{saved.length}</strong><small>Across 3 categories</small></div></article><article><span className="plum"><FileText /></span><div><p>Quotes received</p><strong>2</strong><small>₦1.3m combined</small></div></article><article><span className="green"><CircleDollarSign /></span><div><p>Budget planned</p><strong>42%</strong><small>₦2.1m of ₦5m</small></div></article><article><span className="gold"><Mail /></span><div><p>Unread messages</p><strong>2</strong><small>Latest 10:42 today</small></div></article></div>

          <div className="couple-dashboard-grid">
            <section className="couple-dash-card shortlist-card" id="couple-shortlist"><div className="couple-card-heading"><div><h2>Your shortlist</h2><p>Saved and AI-recommended vendors</p></div><Link href="/couples/match">See all <ArrowRight /></Link></div><div className="shortlist-row">{coupleVendors.slice(2, 5).map((vendor, index) => <article key={vendor.name}><div><img src={vendor.image} alt={`${vendor.name} portfolio`} /><span>{94 - index * 3}% match</span><button className={saved.includes(vendor.name) ? "saved" : ""} onClick={() => toggleSaved(vendor.name)}><Heart fill={saved.includes(vendor.name) ? "currentColor" : "none"} /></button></div><p>{vendor.category}</p><h3>{vendor.name}</h3><span><MapPin /> {vendor.location} · <Star fill="currentColor" /> {vendor.rating}</span><footer><strong>{vendor.price}</strong>{vendor.name === "Aurora Events NG" ? <Link href="/vendor/aurora-events" aria-label={`View ${vendor.name}`}><ChevronRight /></Link> : <Link href={`/couples/sign-up?vendor=${encodeURIComponent(vendor.name)}`} aria-label={`Enquire with ${vendor.name}`}><ChevronRight /></Link>}</footer></article>)}</div></section>

            <aside className="couple-side-column"><section className="couple-dash-card budget-card" id="couple-budget"><div className="couple-card-heading"><div><h2>Budget snapshot</h2><p>Vendor budget</p></div><button onClick={() => showNotice("Budget details opened")}>View</button></div><div className="budget-ring"><div><strong>42%</strong><small>allocated</small></div></div><div className="budget-numbers"><span><small>Planned</small><strong>₦5,000,000</strong></span><span><small>Allocated</small><strong>₦2,100,000</strong></span></div><div className="budget-remaining"><span>Remaining</span><strong>₦2,900,000</strong></div></section><section className="couple-dash-card next-steps-card" id="couple-planning"><div className="couple-card-heading"><div><h2>Next steps</h2><p>Keep things moving</p></div></div><label><input type="checkbox" defaultChecked /><span><strong>Set your wedding details</strong><small>Completed</small></span></label><label><input type="checkbox" /><span><strong>Request photographer quotes</strong><small>2 recommendations ready</small></span></label><label><input type="checkbox" /><span><strong>Shortlist your cake vendor</strong><small>Due this week</small></span></label></section></aside>
          </div>

          <section className="couple-dash-card activity-card" id="couple-activity"><div className="couple-card-heading"><div><h2>Recent activity</h2><p>Your latest vendor updates</p></div><button onClick={() => showNotice("Messages opened")}>View messages</button></div><div><span className="activity-avatar coral">AE</span><p><strong>Aurora Events sent you a quote</strong><small>Full Celebration Package · ₦850,000</small></p><time>12 mins ago</time><Link href="/vendor/aurora-events" aria-label="View Aurora Events activity"><ChevronRight /></Link></div><div><span className="activity-avatar green">LL</span><p><strong>Lagos Lens Co. replied to your enquiry</strong><small>“Your date is available — we’d love to hear more…”</small></p><time>1 hour ago</time><Link href="/couples/sign-up?vendor=Lagos%20Lens%20Co." aria-label="View Lagos Lens message"><ChevronRight /></Link></div></section>
        </div>
      </section>
      {notice && <div className="dashboard-toast">{notice}</div>}
    </main>
  );
}
