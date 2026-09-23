"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { ArrowRight, Bell, CalendarCheck2, CalendarDays, ChevronRight, CircleDollarSign, FileText, Heart, LayoutDashboard, LogOut, Mail, MapPin, Menu, MessageSquare, Search, Settings, Sparkles, Star, UserRound, UsersRound, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";
import { coupleVendors } from "../vendor-data";
import { coupleVendorFromMarketplaceRecord, type CoupleVendor, type MarketplaceVendorListResponse } from "@smitten/shared";
import { Brand } from "../../components/Brand";

type MobileTab = "home" | "matches" | "saved" | "account";
type DashboardVendor = CoupleVendor & { acceptingEnquiries: boolean };

export default function CoupleDashboardClient({ profile }: { profile: { fullName: string; email: string } }) {
  const { signOut } = useClerk();
  const [mobileNav, setMobileNav] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("home");
  const [saved, setSaved] = useState<string[]>([]);
  const [conversationCount, setConversationCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [liveVendors, setLiveVendors] = useState<DashboardVendor[]>([]);
  const [quoteCount, setQuoteCount] = useState(0);
  const [quoteValue, setQuoteValue] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const firstName = profile.fullName.split(/\s+/)[0] || "there";
  const initials = profile.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "SM";

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/favourites", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (cancelled || !Array.isArray(result?.favourites)) return;
        setSaved(result.favourites.map((item: { vendorId: string }) => item.vendorId));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/conversations", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (cancelled || !Array.isArray(result?.conversations)) return;
        setConversationCount(result.conversations.length);
        setUnreadMessages(result.conversations.reduce((total: number, item: { unreadCount?: number }) => total + Number(item.unreadCount ?? 0), 0));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch("/api/quotes", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
      fetch("/api/bookings", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
    ]).then(([quoteResult, bookingResult]) => {
      if (cancelled) return;
      if (Array.isArray(quoteResult?.quotes)) {
        setQuoteCount(quoteResult.quotes.length);
        setQuoteValue(quoteResult.quotes.reduce((total: number, quote: { total?: number }) => total + Number(quote.total ?? 0), 0));
      }
      if (Array.isArray(bookingResult?.bookings)) setBookingCount(bookingResult.bookings.length);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/vendors", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<MarketplaceVendorListResponse> : null)
      .then((result) => {
        if (cancelled || !result?.vendors) return;
        const mapped = result.vendors.map((record) => ({
          ...coupleVendorFromMarketplaceRecord(record),
          acceptingEnquiries: Boolean(record.acceptingEnquiries),
        })).sort((a, b) => Number(b.acceptingEnquiries) - Number(a.acceptingEnquiries));
        setLiveVendors(mapped);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function toggleSaved(vendorId: string) {
    const wasSaved = saved.includes(vendorId);
    setSaved((current) => wasSaved ? current.filter((item) => item !== vendorId) : [...current, vendorId]);

    try {
      const response = await fetch("/api/favourites", {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });
      if (!response.ok) throw new Error("Favourite update failed");
    } catch {
      setSaved((current) => wasSaved ? [...current, vendorId] : current.filter((item) => item !== vendorId));
      setNotice("We couldn’t update your saved vendors. Please try again.");
    }
  }

  function showNotice(message: string) {
    setNotice(message);
    setMobileNav(false);
  }

  function goTo(id: string, message?: string, tab?: MobileTab) {
    setAccountOpen(false);
    setMobileNav(false);
    if (tab) setMobileTab(tab);
    window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    if (message) setNotice(message);
  }

  function openAccount() {
    setMobileNav(false);
    setMobileTab("account");
    setAccountOpen(true);
  }

  function closeAccount() {
    setAccountOpen(false);
    setMobileTab("home");
  }

  return (
    <main className="couple-dashboard-shell">
      <aside className={mobileNav ? "couple-sidebar open" : "couple-sidebar"}>
        <div className="couple-sidebar-brand"><Brand /><button onClick={() => setMobileNav(false)}><X /></button></div>
        <div className="wedding-countdown"><span><CalendarDays /></span><p><strong>Amara & Tunde</strong><small>18 December 2026</small></p><b>127 days</b></div>
        <nav><small>My wedding</small><button className="active" onClick={() => goTo("couple-overview", "Overview opened", "home")}><LayoutDashboard /> Overview</button><Link href="/couples/match" onClick={() => setMobileTab("matches")}><Sparkles /> AI matches <span>New</span></Link><button onClick={() => goTo("couple-shortlist", "Saved vendors opened", "saved")}><Heart /> Saved vendors <b>{saved.length}</b></button><Link href="/couples/quotes"><FileText /> Quotes {quoteCount > 0 && <b>{quoteCount}</b>}</Link><Link href="/couples/bookings"><CalendarCheck2 /> Bookings {bookingCount > 0 && <b>{bookingCount}</b>}</Link><Link href="/couples/messages"><MessageSquare /> Messages {unreadMessages > 0 && <b>{unreadMessages}</b>}</Link><small>Planning</small><button onClick={() => goTo("couple-budget", "Budget opened")}><WalletCards /> Budget</button><button onClick={() => goTo("couple-planning", "Guest planning opened")}><UsersRound /> Guest list</button><button onClick={openAccount}><Settings /> Wedding settings</button></nav>
        <div className="couple-sidebar-bottom"><span>{initials}</span><p><strong>{profile.fullName}</strong><small>{profile.email}</small></p><button onClick={() => signOut({ redirectUrl: "/" })} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button></div>
      </aside>
      {mobileNav && <button className="couple-sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

      <section className="couple-dashboard-main">
        <header className="couple-dashboard-top">
          <button className="couple-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></button>
          <div className="couple-mobile-brand"><Brand /></div>
          <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && query.trim()) window.location.href = `/?q=${encodeURIComponent(query.trim())}#featured`; }} placeholder="Search vendors, quotes or messages…" /></label>
          <div className="couple-top-actions">
            <Link href="/">Browse marketplace</Link>
            <Link className="couple-notification-button" href="/couples/messages" aria-label="Open messages"><Bell />{unreadMessages > 0 && <span />}</Link>
            <div className="couple-account-wrap">
              <button className="couple-account-trigger" onClick={() => accountOpen ? closeAccount() : openAccount()} aria-expanded={accountOpen} aria-label="Open account menu">{initials}</button>
            </div>
          </div>
        </header>

        <div className="couple-dashboard-content" id="couple-overview">
          <div className="couple-dash-heading"><div><p>Thursday, 13 August</p><h1>Good afternoon, {firstName}</h1><span>You’re making lovely progress. Here’s what’s next for your wedding.</span></div><Link href="/" className="button button-primary">Find vendors <Search size={16} /></Link></div>

          <section className="couple-ai-banner"><div className="couple-ai-icon"><Sparkles /></div><div><p>Smitten AI recommendations</p><h2>Your personalised vendor shortlist is ready</h2><span>We found 4 strong matches for your Lagos wedding and ₦1m–₦3m vendor budget.</span></div><Link href="/couples/match" onClick={() => setMobileTab("matches")}>View my matches <ArrowRight /></Link><div className="mini-matches"><span>AE</span><span>LL</span><span>DC</span><span>+1</span></div></section>

          <div className="couple-stat-grid"><article><span className="coral"><Heart /></span><div><p>Saved vendors</p><strong>{saved.length}</strong><small>Across your shortlist</small></div></article><article><span className="plum"><FileText /></span><div><p>Quotes received</p><strong>{quoteCount}</strong><small>{quoteCount ? `${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(quoteValue)} combined` : "No quotes yet"}</small></div></article><article><span className="green"><CircleDollarSign /></span><div><p>Budget planned</p><strong>42%</strong><small>₦2.1m of ₦5m</small></div></article><article><span className="gold"><Mail /></span><div><p>Unread messages</p><strong>{unreadMessages}</strong><small>{conversationCount ? `${conversationCount} active conversation${conversationCount === 1 ? "" : "s"}` : "No vendor conversations yet"}</small></div></article></div>

          <div className="couple-dashboard-grid">
            <section className="couple-dash-card shortlist-card" id="couple-shortlist"><div className="couple-card-heading"><div><h2>Vendors ready to hear from you</h2><p>Live Smitten vendors are shown first</p></div><Link href="/#featured">Browse all <ArrowRight /></Link></div><div className="shortlist-row">{(liveVendors.length ? liveVendors : coupleVendors.map((vendor) => ({ ...vendor, acceptingEnquiries: false }))).slice(0, 3).map((vendor, index) => <article key={vendor.id}><div><img src={vendor.image} alt={`${vendor.name} portfolio`} /><span>{vendor.acceptingEnquiries ? "Accepting enquiries" : `${94 - index * 3}% match`}</span><button className={saved.includes(vendor.id) ? "saved" : ""} onClick={() => void toggleSaved(vendor.id)} aria-label={`${saved.includes(vendor.id) ? "Remove" : "Save"} ${vendor.name}`}><Heart fill={saved.includes(vendor.id) ? "currentColor" : "none"} /></button></div><p>{vendor.category}</p><h3>{vendor.name}</h3><span><MapPin /> {vendor.location} · <Star fill="currentColor" /> {vendor.rating}</span><footer><strong>{vendor.price}</strong><Link href={`/vendor/${vendor.id}`} aria-label={`View ${vendor.name}`}><ChevronRight /></Link></footer></article>)}</div></section>

            <aside className="couple-side-column"><section className="couple-dash-card budget-card" id="couple-budget"><div className="couple-card-heading"><div><h2>Budget snapshot</h2><p>Vendor budget</p></div><button onClick={() => showNotice("Budget details opened")}>View</button></div><div className="budget-ring"><div><strong>42%</strong><small>allocated</small></div></div><div className="budget-numbers"><span><small>Planned</small><strong>₦5,000,000</strong></span><span><small>Allocated</small><strong>₦2,100,000</strong></span></div><div className="budget-remaining"><span>Remaining</span><strong>₦2,900,000</strong></div></section><section className="couple-dash-card next-steps-card" id="couple-planning"><div className="couple-card-heading"><div><h2>Next steps</h2><p>Keep things moving</p></div></div><label><input type="checkbox" defaultChecked /><span><strong>Set your wedding details</strong><small>Completed</small></span></label><label><input type="checkbox" /><span><strong>Request photographer quotes</strong><small>2 recommendations ready</small></span></label><label><input type="checkbox" /><span><strong>Shortlist your cake vendor</strong><small>Due this week</small></span></label></section></aside>
          </div>

          <section className="couple-dash-card activity-card" id="couple-activity"><div className="couple-card-heading"><div><h2>Recent activity</h2><p>Your latest vendor updates</p></div><Link href="/couples/messages">View messages</Link></div><div><span className="activity-avatar coral">AE</span><p><strong>Aurora Events sent you a quote</strong><small>Full Celebration Package · ₦850,000</small></p><time>12 mins ago</time><Link href="/vendor/aurora-events-ng" aria-label="View Aurora Events activity"><ChevronRight /></Link></div><div><span className="activity-avatar green">LL</span><p><strong>Lagos Lens Co. replied to your enquiry</strong><small>“Your date is available — we’d love to hear more…”</small></p><time>1 hour ago</time><Link href="/couples/sign-up?vendor=Lagos%20Lens%20Co." aria-label="View Lagos Lens message"><ChevronRight /></Link></div></section>
        </div>
      </section>

      {accountOpen && <>
        <button className="couple-account-scrim" aria-label="Close account menu" onClick={closeAccount} />
        <div className="couple-account-menu couple-account-sheet">
          <div className="couple-account-summary"><span>{initials}</span><div><strong>{profile.fullName}</strong><small>{profile.email}</small></div><button className="couple-account-close" onClick={closeAccount} aria-label="Close account menu"><X size={17} /></button></div>
          <button onClick={() => showNotice("Wedding settings opened")}><Settings size={17} /><span><strong>Wedding settings</strong><small>Preferences and planning details</small></span></button>
          <Link href="/"><Search size={17} /><span><strong>Browse marketplace</strong><small>Find more wedding vendors</small></span></Link>
          <button className="logout" onClick={() => signOut({ redirectUrl: "/" })}><LogOut size={17} /><span><strong>Log out</strong><small>Sign out of Smitten</small></span></button>
        </div>
      </>}

      <nav className="couple-mobile-nav" aria-label="Mobile dashboard navigation">
        <button className={mobileTab === "home" ? "active" : ""} onClick={() => goTo("couple-overview", undefined, "home")}><LayoutDashboard /><span>Home</span></button>
        <Link className={mobileTab === "matches" ? "active" : ""} href="/couples/match" onClick={() => setMobileTab("matches")}><Sparkles /><span>Matches</span></Link>
        <button className={mobileTab === "saved" ? "active" : ""} onClick={() => goTo("couple-shortlist", undefined, "saved")}><Heart /><span>Saved</span></button>
        <button className={mobileTab === "account" ? "active" : ""} onClick={openAccount}><UserRound /><span>Account</span></button>
      </nav>

      {notice && <div className="dashboard-toast">{notice}</div>}
    </main>
  );
}
