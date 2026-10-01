"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import { useClerk } from "@clerk/nextjs";
import {
  ArrowRight,
  Bell,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Search,
  Settings,
  Sparkles,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { coupleVendors } from "../vendor-data";
import {
  coupleVendorFromMarketplaceRecord,
  type CoupleVendor,
  type MarketplaceVendorListResponse,
  type MarketplaceVendorRecord,
} from "@smitten/shared";

type MobileTab = "home" | "saved" | "account";
type DashboardVendor = CoupleVendor & { acceptingEnquiries: boolean };

export default function CoupleDashboardClient({
  profile,
}: {
  profile: { fullName: string; email: string };
}) {
  const { signOut } = useClerk();
  const view = useSearchParams().get("view");
  const accountOpen = view === "settings";
  const mobileTab: MobileTab = accountOpen ? "account" : view === "saved" ? "saved" : "home";
  const [saved, setSaved] = useState<string[]>([]);
  const [favouriteVendors, setFavouriteVendors] = useState<DashboardVendor[]>([]);
  const [loadingFavourites, setLoadingFavourites] = useState(true);
  const [favouritesError, setFavouritesError] = useState("");
  const [favouritesReload, setFavouritesReload] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [liveVendors, setLiveVendors] = useState<DashboardVendor[]>([]);
  const [quoteCount, setQuoteCount] = useState(0);
  const [quoteValue, setQuoteValue] = useState(0);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const firstName = profile.fullName.split(/\s+/)[0] || "there";
  const initials =
    profile.fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SM";

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/favourites", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Favourites could not be loaded");
        return response.json();
      })
      .then((result) => {
        if (cancelled || !Array.isArray(result?.favourites)) return;
        setFavouritesError("");
        setSaved(
          result.favourites.map((item: { vendorId: string }) => item.vendorId),
        );
        setFavouriteVendors(result.favourites.map((item: {
          vendor: MarketplaceVendorRecord & { ownerClerkUserId?: string | null };
        }) => ({
          ...coupleVendorFromMarketplaceRecord(item.vendor),
          acceptingEnquiries: Boolean(item.vendor.ownerClerkUserId),
        })));
      })
      .catch(() => {
        if (!cancelled) setFavouritesError("We couldn’t load your saved vendors. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoadingFavourites(false);
      });
    return () => {
      cancelled = true;
    };
  }, [favouritesReload]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/conversations", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (cancelled || !Array.isArray(result?.conversations)) return;
        setConversationCount(result.conversations.length);
        setUnreadMessages(
          result.conversations.reduce(
            (total: number, item: { unreadCount?: number }) =>
              total + Number(item.unreadCount ?? 0),
            0,
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/quotes", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((quoteResult) => {
        if (cancelled) return;
        if (Array.isArray(quoteResult?.quotes)) {
          setQuoteCount(quoteResult.quotes.length);
          setQuoteValue(
            quoteResult.quotes.reduce(
              (total: number, quote: { total?: number }) =>
                total + Number(quote.total ?? 0),
              0,
            ),
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/vendors", { cache: "no-store" })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<MarketplaceVendorListResponse>)
          : null,
      )
      .then((result) => {
        if (cancelled || !result?.vendors) return;
        const mapped = result.vendors
          .map((record) => ({
            ...coupleVendorFromMarketplaceRecord(record),
            acceptingEnquiries: Boolean(record.acceptingEnquiries),
          }))
          .sort(
            (a, b) =>
              Number(b.acceptingEnquiries) - Number(a.acceptingEnquiries),
          );
        setLiveVendors(mapped);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function toggleSaved(vendorId: string) {
    const wasSaved = saved.includes(vendorId);
    setSaved((current) =>
      wasSaved
        ? current.filter((item) => item !== vendorId)
        : [...current, vendorId],
    );

    try {
      const response = await fetch("/api/favourites", {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });
      if (!response.ok) throw new Error("Favourite update failed");
    } catch {
      setSaved((current) =>
        wasSaved
          ? [...current, vendorId]
          : current.filter((item) => item !== vendorId),
      );
      setNotice("We couldn’t update your saved vendors. Please try again.");
    }
  }

  function showNotice(message: string) {
    setNotice(message);
  }

  function goTo(id: string, message?: string, tab?: MobileTab) {
    if (tab) {
      const url = new URL(window.location.href);
      if (tab === "saved") url.searchParams.set("view", "saved");
      else url.searchParams.delete("view");
      url.hash = id;
      window.history.replaceState(null, "", url);
    }
    window.requestAnimationFrame(() =>
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    if (message) setNotice(message);
  }

  function openAccount() {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "settings");
    window.history.replaceState(null, "", url);
  }

  function closeAccount() {
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  }

  const recommendedVendors = liveVendors.length
    ? liveVendors
    : coupleVendors.map((vendor) => ({ ...vendor, acceptingEnquiries: false }));
  const vendorById = new Map([...favouriteVendors, ...recommendedVendors].map((vendor) => [vendor.id, vendor]));
  const showingSaved = mobileTab === "saved";
  const visibleVendors = showingSaved
    ? saved.flatMap((id) => vendorById.has(id) ? [vendorById.get(id)!] : [])
    : recommendedVendors.slice(0, 3);

  return (
    <main className="couple-dashboard-shell">
      <section className="couple-dashboard-main">
        <WorkspaceHeader
          role="couple"
          activeSection={accountOpen ? "settings" : showingSaved ? "saved" : "overview"}
          className="couple-dashboard-top"
          search={
            <label className="workspace-search">
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && query.trim())
                    window.location.href = `/?q=${encodeURIComponent(query.trim())}#featured`;
                }}
                placeholder="Search vendors, quotes or messages…"
              />
            </label>
          }
          accountControls={
            <div className="couple-top-actions">
              <Link href="/">Browse marketplace</Link>
              <Link
                className="couple-notification-button"
                href="/couples/messages"
                aria-label="Open messages"
              >
                <Bell />
                {unreadMessages > 0 && <span />}
              </Link>
              <div className="couple-account-wrap">
                <button
                  className="couple-account-trigger"
                  onClick={() => (accountOpen ? closeAccount() : openAccount())}
                  aria-expanded={accountOpen}
                  aria-label="Open account menu"
                >
                  {initials}
                </button>
              </div>
            </div>
          }
        />

        <div className="couple-dashboard-content" id="couple-overview">
          <div className="couple-dash-heading">
            <div>
              <p>Welcome back, {firstName}</p>
              <h1>
                Your day,
                <br />
                <em>coming together.</em>
              </h1>
              <span>
                Your favourite people, places and plans, all in one place.
              </span>
            </div>
            <Link href="/" className="button button-primary">
              Find vendors <Search size={16} />
            </Link>
          </div>

          <div className="couple-stat-grid">
            <article>
              <button type="button" className="couple-stat-action" aria-label="View saved vendors" onClick={() => goTo("couple-shortlist", undefined, "saved")} />
              <span className="coral">
                <Heart />
              </span>
              <div>
                <p>Saved vendors</p>
                <strong>{loadingFavourites ? "…" : saved.length}</strong>
                <small>Across your shortlist</small>
              </div>
            </article>
            <article>
              <Link className="couple-stat-action" href="/couples/quotes" aria-label="View quotes received" />
              <span className="plum">
                <FileText />
              </span>
              <div>
                <p>Quotes received</p>
                <strong>{quoteCount}</strong>
                <small>
                  {quoteCount
                    ? `${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(quoteValue)} combined`
                    : "No quotes yet"}
                </small>
              </div>
            </article>
            <article>
              <button type="button" className="couple-stat-action" aria-label="View sample budget snapshot" onClick={() => goTo("couple-budget")} />
              <span className="green">
                <CircleDollarSign />
              </span>
              <div>
                <p>Sample budget</p>
                <strong>42%</strong>
                <small>₦2.1m of ₦5m</small>
              </div>
            </article>
            <article>
              <Link className="couple-stat-action" href="/couples/messages" aria-label="View unread messages" />
              <span className="gold">
                <Mail />
              </span>
              <div>
                <p>Unread messages</p>
                <strong>{unreadMessages}</strong>
                <small>
                  {conversationCount
                    ? `${conversationCount} active conversation${conversationCount === 1 ? "" : "s"}`
                    : "No vendor conversations yet"}
                </small>
              </div>
            </article>
          </div>

          <div className="couple-dashboard-grid">
            <section
              className="couple-dash-card shortlist-card"
              id="couple-shortlist"
            >
              <div className="couple-card-heading">
                <div>
                  <h2>{showingSaved ? "Your saved vendors" : "Vendors ready to hear from you"}</h2>
                  <p>{showingSaved ? "Your favourites, together in one place" : "Live Smitten vendors are shown first"}</p>
                </div>
                <Link href="/#featured">
                  Browse all <ArrowRight />
                </Link>
              </div>
              {showingSaved && (loadingFavourites || favouritesError || visibleVendors.length === 0) && (
                <div className="couple-shortlist-status" role="status">
                  <p>{loadingFavourites ? "Loading your saved vendors…" : favouritesError || "You haven’t saved any vendors yet. Tap a vendor’s heart to start your shortlist."}</p>
                  {favouritesError && !loadingFavourites && (
                    <button type="button" className="button button-dark button-small" onClick={() => {
                      setLoadingFavourites(true);
                      setFavouritesReload((value) => value + 1);
                    }}>Try again</button>
                  )}
                </div>
              )}
              <div className="shortlist-row">
                {visibleVendors.map((vendor, index) => (
                    <article key={vendor.id}>
                      <div>
                        <img
                          src={vendor.image}
                          alt={`${vendor.name} portfolio`}
                          loading="lazy"
                          decoding="async"
                        />
                        <span>
                          {vendor.acceptingEnquiries
                            ? "Accepting enquiries"
                            : `${94 - index * 3}% match`}
                        </span>
                        <button
                          className={saved.includes(vendor.id) ? "saved" : ""}
                          onClick={() => void toggleSaved(vendor.id)}
                          aria-label={`${saved.includes(vendor.id) ? "Remove" : "Save"} ${vendor.name}`}
                        >
                          <Heart
                            fill={
                              saved.includes(vendor.id)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      </div>
                      <p>{vendor.category}</p>
                      <h3>{vendor.name}</h3>
                      <span>
                        <MapPin /> {vendor.location} ·{" "}
                        <Star fill="currentColor" /> {vendor.rating}
                      </span>
                      <footer>
                        <strong>{vendor.price}</strong>
                        <Link
                          href={`/vendor/${vendor.id}`}
                          aria-label={`View ${vendor.name}`}
                        >
                          <ChevronRight />
                        </Link>
                      </footer>
                    </article>
                  ))}
              </div>
            </section>

            <aside className="couple-side-column">
              <section
                className="couple-dash-card budget-card"
                id="couple-budget"
              >
                <div className="couple-card-heading">
                  <div>
                    <h2>Budget snapshot</h2>
                    <p>Sample vendor budget</p>
                  </div>
                </div>
                <div className="budget-ring">
                  <div>
                    <strong>42%</strong>
                    <small>allocated</small>
                  </div>
                </div>
                <div className="budget-numbers">
                  <span>
                    <small>Planned</small>
                    <strong>₦5,000,000</strong>
                  </span>
                  <span>
                    <small>Allocated</small>
                    <strong>₦2,100,000</strong>
                  </span>
                </div>
                <div className="budget-remaining">
                  <span>Remaining</span>
                  <strong>₦2,900,000</strong>
                </div>
              </section>
              <section
                className="couple-dash-card next-steps-card"
                id="couple-planning"
              >
                <div className="couple-card-heading">
                  <div>
                    <h2>Next steps</h2>
                    <p>Keep things moving</p>
                  </div>
                </div>
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>
                    <strong>Set your wedding details</strong>
                    <small>Completed</small>
                  </span>
                </label>
                <label>
                  <input type="checkbox" />
                  <span>
                    <strong>Request photographer quotes</strong>
                    <small>2 recommendations ready</small>
                  </span>
                </label>
                <label>
                  <input type="checkbox" />
                  <span>
                    <strong>Shortlist your cake vendor</strong>
                    <small>Due this week</small>
                  </span>
                </label>
              </section>
            </aside>
          </div>
        </div>
      </section>

      {accountOpen && (
        <>
          <button
            className="couple-account-scrim"
            aria-label="Close account menu"
            onClick={closeAccount}
          />
          <div className="couple-account-menu couple-account-sheet">
            <div className="couple-account-summary">
              <span>{initials}</span>
              <div>
                <strong>{profile.fullName}</strong>
                <small>{profile.email}</small>
              </div>
              <button
                className="couple-account-close"
                onClick={closeAccount}
                aria-label="Close account menu"
              >
                <X size={17} />
              </button>
            </div>
            <button onClick={() => showNotice("Wedding settings opened")}>
              <Settings size={17} />
              <span>
                <strong>Wedding settings</strong>
                <small>Preferences and planning details</small>
              </span>
            </button>
            <Link href="/">
              <Search size={17} />
              <span>
                <strong>Browse marketplace</strong>
                <small>Find more wedding vendors</small>
              </span>
            </Link>
            <button
              className="logout"
              onClick={() => signOut({ redirectUrl: "/" })}
            >
              <LogOut size={17} />
              <span>
                <strong>Log out</strong>
                <small>Sign out of Smitten</small>
              </span>
            </button>
          </div>
        </>
      )}

      <nav
        className="couple-mobile-nav"
        aria-label="Mobile dashboard navigation"
      >
        <button
          className={mobileTab === "home" ? "active" : ""}
          onClick={() => goTo("couple-overview", undefined, "home")}
        >
          <LayoutDashboard />
          <span>Home</span>
        </button>
        <Link
          href="/couples/match"
        >
          <Sparkles />
          <span>Matches</span>
        </Link>
        <button
          className={mobileTab === "saved" ? "active" : ""}
          onClick={() => goTo("couple-shortlist", undefined, "saved")}
        >
          <Heart />
          <span>Saved</span>
        </button>
        <button
          className={mobileTab === "account" ? "active" : ""}
          onClick={openAccount}
        >
          <UserRound />
          <span>Account</span>
        </button>
      </nav>

      {notice && <div className="dashboard-toast">{notice}</div>}
    </main>
  );
}
