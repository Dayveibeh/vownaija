"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WorkspaceHeader } from "../components/WorkspaceHeader";
import { useClerk } from "@clerk/nextjs";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarCheck2,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Brand } from "../components/Brand";
import type { ConversationSummary } from "@/lib/messaging";

type Tab =
  "Overview" | "Enquiries" | "Quotes" | "Messages" | "Portfolio" | "Reviews";

function compactAge(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function shortWeddingDate(value: string | null) {
  if (!value) return "Date flexible";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value + "T12:00:00"));
}

const leads = [
  {
    initials: "AO",
    name: "Amara & Tunde",
    service: "Full wedding planning",
    date: "18 Dec 2026",
    budget: "₦3m–₦5m",
    age: "12m",
    tone: "peach",
  },
  {
    initials: "NI",
    name: "Nneka & Ifeanyi",
    service: "Reception décor",
    date: "24 Jan 2027",
    budget: "₦1m–₦3m",
    age: "1h",
    tone: "green",
  },
  {
    initials: "ZM",
    name: "Zainab & Musa",
    service: "Wedding day coordination",
    date: "04 Apr 2027",
    budget: "₦500k–₦1m",
    age: "3h",
    tone: "gold",
  },
];

const initialQuotes = [
  {
    id: "SM-1042",
    client: "Amara & Tunde",
    title: "Full Celebration Package",
    amount: 3750000,
    status: "Viewed",
    date: "12 Aug 2026",
  },
  {
    id: "SM-1039",
    client: "Nneka & Ifeanyi",
    title: "Signature Styling",
    amount: 1250000,
    status: "Sent",
    date: "10 Aug 2026",
  },
  {
    id: "SM-1034",
    client: "Bisi & Femi",
    title: "Day Coordination",
    amount: 650000,
    status: "Accepted",
    date: "06 Aug 2026",
  },
  {
    id: "SM-1028",
    client: "Zainab & Musa",
    title: "Traditional Wedding Décor",
    amount: 980000,
    status: "Draft",
    date: "02 Aug 2026",
  },
];

const messages = [
  {
    initials: "AO",
    name: "Amara Okoye",
    subject: "Full Celebration quote",
    text: "Thank you for sending this over! Could we swap the floral arch…",
    time: "10:42",
    unread: true,
  },
  {
    initials: "NI",
    name: "Nneka Ibe",
    subject: "Reception décor",
    text: "Hi Adaeze, the venue confirmed we can access from 8am.",
    time: "Yesterday",
    unread: true,
  },
  {
    initials: "BF",
    name: "Bisi Falana",
    subject: "Final timeline",
    text: "Everything looks perfect. See you on Saturday!",
    time: "Mon",
    unread: false,
  },
];



export default function DashboardClient({
  profile,
}: {
  profile: { fullName: string; email: string; businessName: string; vendorId: string | null };
}) {
  const { signOut } = useClerk();
  const view = useSearchParams().get("view");
  const [tab, setTab] = useState<Tab>(
    view === "portfolio"
      ? "Portfolio"
      : view === "reviews"
        ? "Reviews"
        : "Overview",
  );

  useEffect(() => {
    setTab(
      view === "portfolio"
        ? "Portfolio"
        : view === "reviews"
          ? "Reviews"
          : "Overview",
    );
  }, [view]);
  const [mobileNav, setMobileNav] = useState(false);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [editQuote, setEditQuote] = useState<
    (typeof initialQuotes)[number] | null
  >(null);
  const [lineItems, setLineItems] = useState([
    { description: "Planning and creative direction", amount: 1200000 },
    { description: "Décor production and installation", amount: 1850000 },
    { description: "On-the-day coordination", amount: 450000 },
  ]);
  const [selectedMessage, setSelectedMessage] = useState(0);
  const [emailText, setEmailText] = useState(
    "Hi Amara,\n\nThank you for your message. We can absolutely swap the floral arch for a soft fabric installation and keep the same colour direction. I’ll update your quote and send it across this afternoon.\n\nWarmly,\nAdaeze",
  );
  const [toast, setToast] = useState("");
  const [liveQuoteCount, setLiveQuoteCount] = useState(0);
  const [liveOpenQuoteValue, setLiveOpenQuoteValue] = useState(0);
  const [liveBookingCount, setLiveBookingCount] = useState(0);
  const [liveEnquiries, setLiveEnquiries] = useState<ConversationSummary[]>([]);
  const [quoteStats, setQuoteStats] = useState({
    sent: 0,
    viewed: 0,
    accepted: 0,
  });
  const publicVendorId = profile.vendorId;
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const firstName = profile.fullName.split(/\s+/)[0] || "there";
  const initials =
    profile.businessName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SM";

  const quoteTotal = useMemo(
    () =>
      lineItems.reduce((total, item) => total + Number(item.amount || 0), 0),
    [lineItems],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch("/api/conversations", { cache: "no-store" }).then((response) =>
        response.ok ? response.json() : null,
      ),
      fetch("/api/quotes", { cache: "no-store" }).then((response) =>
        response.ok ? response.json() : null,
      ),
      fetch("/api/bookings", { cache: "no-store" }).then((response) =>
        response.ok ? response.json() : null,
      ),

    ])
      .then(
        ([conversationResult, quoteResult, bookingResult]) => {
          if (cancelled) return;
          if (Array.isArray(conversationResult?.conversations))
            setLiveEnquiries(conversationResult.conversations);
          if (Array.isArray(quoteResult?.quotes)) {
            const open = quoteResult.quotes.filter(
              (quote: { status?: string }) =>
                ["sent", "viewed"].includes(String(quote.status)),
            );
            setLiveQuoteCount(open.length);
            setLiveOpenQuoteValue(
              open.reduce(
                (total: number, quote: { total?: number }) =>
                  total + Number(quote.total ?? 0),
                0,
              ),
            );
            setQuoteStats({
              sent: quoteResult.quotes.filter(
                (quote: { status?: string }) => String(quote.status) === "sent",
              ).length,
              viewed: quoteResult.quotes.filter(
                (quote: { status?: string }) =>
                  String(quote.status) === "viewed",
              ).length,
              accepted: quoteResult.quotes.filter(
                (quote: { status?: string }) =>
                  String(quote.status) === "accepted",
              ).length,
            });
          }
          if (Array.isArray(bookingResult?.bookings))
            setLiveBookingCount(bookingResult.bookings.length);

        },
      )
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [profile.businessName]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2800);
  }

  function openQuote(quote?: (typeof initialQuotes)[number]) {
    if (!quote) {
      window.location.href = "/dashboard/enquiries";
      return;
    }
    setEditQuote(quote);
    if (quote)
      setLineItems([{ description: quote.title, amount: quote.amount }]);
    else
      setLineItems([
        { description: "Planning and creative direction", amount: 1200000 },
        { description: "Décor production and installation", amount: 1850000 },
      ]);
    setQuoteOpen(true);
  }

  function saveQuote(event: FormEvent, sendNow = false) {
    event.preventDefault();
    if (editQuote) {
      setQuotes((current) =>
        current.map((quote) =>
          quote.id === editQuote.id
            ? {
                ...quote,
                amount: quoteTotal,
                status: sendNow ? "Sent" : quote.status,
              }
            : quote,
        ),
      );
    } else {
      setQuotes((current) => [
        {
          id: `SM-${1043 + current.length}`,
          client: "Amara & Tunde",
          title: "Custom Wedding Package",
          amount: quoteTotal,
          status: sendNow ? "Sent" : "Draft",
          date: "13 Aug 2026",
        },
        ...current,
      ]);
    }
    setQuoteOpen(false);
    showToast(sendNow ? "Quote sent to the client" : "Quote saved as a draft");
  }

  return (
    <main className="dashboard-shell">
      <aside
        className={
          mobileNav ? "dashboard-sidebar mobile-open" : "dashboard-sidebar"
        }
      >
        <div className="dash-brand-row">
          <Brand />
          <button onClick={() => setMobileNav(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="vendor-switcher">
          <span>{initials}</span>
          <div>
            <strong>{profile.businessName}</strong>
            <small>Vendor workspace</small>
          </div>
          <ChevronDown size={16} />
        </div>
        <nav>
          <small>Workspace</small>
          <button
            className={tab === "Overview" ? "active" : ""}
            onClick={() => setTab("Overview")}
          >
            <LayoutDashboard size={18} /> Overview
          </button>
          <Link href="/dashboard/enquiries">
            <Users size={18} /> Enquiries
          </Link>
          <Link href="/dashboard/quotes">
            <FileText size={18} /> Quotes{" "}
            {liveQuoteCount > 0 && <span>{liveQuoteCount}</span>}
          </Link>
          <Link href="/dashboard/bookings">
            <CalendarCheck2 size={18} /> Bookings{" "}
            {liveBookingCount > 0 && <span>{liveBookingCount}</span>}
          </Link>
          <Link href="/dashboard/payments">
            <CircleDollarSign size={18} /> Payments
          </Link>
          <Link href="/dashboard/payouts">
            <CircleDollarSign size={18} /> Payout account
          </Link>
          <Link href="/dashboard/messages">
            <Mail size={18} /> Messages
          </Link>
          <small>Business</small>
          <Link href="/dashboard/profile"><Settings size={18} /> Business profile</Link>
          <Link href="/dashboard/profile#packages"><FileText size={18} /> Packages</Link>
          <Link href="/dashboard/profile#portfolio"><ImagePlus size={18} /> Portfolio</Link>
          <Link href="/dashboard/reviews"><Star size={18} /> Reviews</Link>
          <button onClick={() => showToast("Insights report opened")}>
            <BarChart3 size={18} /> Insights
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => showToast("Business settings opened")}>
            <Settings size={18} /> Settings
          </button>
          {publicVendorId ? (
            <Link href={`/vendor/${publicVendorId}`}>
              <ArrowRight size={17} /> View public profile
            </Link>
          ) : (
            <Link href="/">
              <ArrowRight size={17} /> Browse marketplace
            </Link>
          )}
          <button onClick={() => signOut({ redirectUrl: "/" })}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <WorkspaceHeader
          role="vendor"
          className="dashboard-topbar"
          activeSection={view || tab.toLowerCase()}
          accountControls={
            <>
              <Link
                className="notification-button"
                href="/dashboard/messages"
                aria-label="Open messages"
              >
                <Bell size={19} />
                <span />
              </Link>
              <div className="dashboard-account-wrap">
                <button
                  className="user-avatar"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  aria-label="Open account menu"
                  aria-expanded={accountMenuOpen}
                >
                  {initials}
                </button>
                {accountMenuOpen && (
                  <div className="dashboard-account-menu">
                    <div>
                      <span>{initials}</span>
                      <p>
                        <strong>{profile.fullName}</strong>
                        <small>{profile.email}</small>
                      </p>
                    </div>
                    {publicVendorId && (
                      <Link
                        href={`/vendor/${publicVendorId}`}
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        <UserRound size={16} /> Public profile
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        showToast("Business settings opened");
                      }}
                    >
                      <Settings size={16} /> Settings
                    </button>
                    <button
                      className="logout"
                      onClick={() => signOut({ redirectUrl: "/" })}
                    >
                      <LogOut size={16} /> Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          }
        />

        <div className="dashboard-content">
          {tab === "Overview" && (
            <Overview
              setTab={setTab}
              showToast={showToast}
              firstName={firstName}
              businessName={profile.businessName}
              quoteCount={liveQuoteCount}
              quoteValue={liveOpenQuoteValue}
              bookingCount={liveBookingCount}
              enquiries={liveEnquiries}
              quoteStats={quoteStats}
            />
          )}
          {tab === "Enquiries" && (
            <Enquiries openQuote={() => openQuote()} showToast={showToast} />
          )}
          {tab === "Quotes" && <Quotes quotes={quotes} openQuote={openQuote} />}
          {tab === "Messages" && (
            <Messages
              selected={selectedMessage}
              setSelected={setSelectedMessage}
              emailText={emailText}
              setEmailText={setEmailText}
              showToast={showToast}
            />
          )}
          {tab === "Portfolio" && <div className="dash-card"><h2>Your portfolio</h2><Link href="/dashboard/profile#portfolio" className="button button-primary">Manage your portfolio</Link></div>}
          {tab === "Reviews" && <Link className="button button-primary" href="/dashboard/reviews">View booking reviews</Link>}
        </div>
      </section>

      {quoteOpen && (
        <div
          className="quote-builder-backdrop"
          onMouseDown={() => setQuoteOpen(false)}
        >
          <section
            className="quote-builder"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="step-label">
                  {editQuote ? `Editing ${editQuote.id}` : "New custom quote"}
                </p>
                <h2>{editQuote ? "Amend quote" : "Build a quote"}</h2>
              </div>
              <button onClick={() => setQuoteOpen(false)}>
                <X />
              </button>
            </header>
            <form onSubmit={(event) => saveQuote(event)}>
              <div className="quote-form-row">
                <label>
                  Client
                  <select defaultValue={editQuote?.client || "Amara & Tunde"}>
                    <option>Amara & Tunde</option>
                    <option>Nneka & Ifeanyi</option>
                    <option>Zainab & Musa</option>
                  </select>
                </label>
                <label>
                  Valid until
                  <input type="date" defaultValue="2026-08-27" />
                </label>
              </div>
              <label>
                Quote title
                <input
                  defaultValue={editQuote?.title || "Custom Wedding Package"}
                />
              </label>
              <div className="line-items-heading">
                <strong>Line items</strong>
                <span>Amount</span>
              </div>
              <div className="line-items">
                {lineItems.map((item, index) => (
                  <div key={index}>
                    <input
                      value={item.description}
                      onChange={(event) =>
                        setLineItems((current) =>
                          current.map((line, lineIndex) =>
                            lineIndex === index
                              ? { ...line, description: event.target.value }
                              : line,
                          ),
                        )
                      }
                    />
                    <div className="money-input">
                      <span>₦</span>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(event) =>
                          setLineItems((current) =>
                            current.map((line, lineIndex) =>
                              lineIndex === index
                                ? {
                                    ...line,
                                    amount: Number(event.target.value),
                                  }
                                : line,
                            ),
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setLineItems((current) =>
                          current.filter((_, lineIndex) => lineIndex !== index),
                        )
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="add-line"
                type="button"
                onClick={() =>
                  setLineItems((current) => [
                    ...current,
                    { description: "", amount: 0 },
                  ])
                }
              >
                <Plus size={16} /> Add line item
              </button>
              <div className="quote-total">
                <span>Total</span>
                <strong>₦{quoteTotal.toLocaleString("en-NG")}</strong>
              </div>
              <label>
                Message to client
                <textarea
                  rows={4}
                  defaultValue="Thank you for considering Aurora Events. This quote has been tailored to your celebration and includes everything discussed."
                />
              </label>
              <div className="quote-builder-actions">
                <button className="save-draft" type="submit">
                  Save draft
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={(event) =>
                    saveQuote(event as unknown as FormEvent, true)
                  }
                >
                  <Send size={17} /> Save & send quote
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {toast && (
        <div className="dashboard-toast">
          <Check size={17} /> {toast}
        </div>
      )}
    </main>
  );
}

function PageHeading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: React.ReactNode;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="dash-page-heading">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        {text && <span>{text}</span>}
      </div>
      {action}
    </div>
  );
}

function Overview({
  setTab,
  showToast,
  firstName,
  businessName,
  quoteCount,
  quoteValue,
  bookingCount,
  enquiries,
  quoteStats,
}: {
  setTab: (tab: Tab) => void;
  showToast: (message: string) => void;
  firstName: string;
  businessName: string;
  quoteCount: number;
  quoteValue: number;
  bookingCount: number;
  enquiries: ConversationSummary[];
  quoteStats: { sent: number; viewed: number; accepted: number };
}) {
  const maxQuoteStat = Math.max(
    quoteStats.sent,
    quoteStats.viewed,
    quoteStats.accepted,
    1,
  );
  return (
    <>
      <PageHeading
        eyebrow={`Welcome back, ${firstName}`}
        title={
          <>
            Your business,
            <br />
            <em>beautifully organised.</em>
          </>
        }
        text={`A clear view of what needs attention across ${businessName}.`}
        action={
          <Link className="button button-primary" href="/dashboard/enquiries">
            <Users size={17} /> View enquiries
          </Link>
        }
      />
      <div className="stat-grid">
        <article>
          <span className="stat-icon coral">
            <Users />
          </span>
          <div>
            <p>Enquiries</p>
            <strong>{enquiries.length}</strong>
            <small>
              {enquiries.length
                ? "Active customer conversations"
                : "No enquiries yet"}
            </small>
          </div>
        </article>
        <article>
          <span className="stat-icon plum">
            <FileText />
          </span>
          <div>
            <p>Open quotes</p>
            <strong>{quoteCount}</strong>
            <small>
              {quoteCount
                ? new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: "NGN",
                    maximumFractionDigits: 0,
                  }).format(quoteValue) + " potential"
                : "No open quotes"}
            </small>
          </div>
        </article>
        <article>
          <span className="stat-icon green">
            <CircleDollarSign />
          </span>
          <div>
            <p>Bookings</p>
            <strong>{bookingCount}</strong>
            <small>
              {bookingCount
                ? "Confirmed through Smitten"
                : "No confirmed bookings yet"}
            </small>
          </div>
        </article>
        <article>
          <span className="stat-icon gold">
            <Star />
          </span>
          <div>
            <p>Reviews</p>
            <strong>—</strong>
            <small>Your verified reviews will appear here</small>
          </div>
        </article>
      </div>
      <div className="overview-grid">
        <section className="dash-card recent-enquiries">
          <div className="dash-card-title">
            <div>
              <h2>Recent enquiries</h2>
              <p>Couples waiting to hear from you</p>
            </div>
            <Link href="/dashboard/enquiries">
              View all <ArrowRight size={15} />
            </Link>
          </div>
          <div className="live-enquiry-list">
            {enquiries.length ? (
              enquiries.slice(0, 3).map((enquiry) => (
                <Link
                  className="live-enquiry-row"
                  href={`/messages/${enquiry.id}`}
                  key={enquiry.id}
                >
                  <span className="lead-avatar peach">
                    {enquiry.customerName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div>
                    <strong>{enquiry.customerName}</strong>
                    <small>
                      {enquiry.requestedService || "Wedding enquiry"} ·{" "}
                      {shortWeddingDate(enquiry.weddingDate)}
                    </small>
                  </div>
                  <span>{enquiry.budgetBand || "Budget flexible"}</span>
                  <small>{compactAge(enquiry.lastMessageAt)}</small>
                  <ArrowRight size={15} />
                </Link>
              ))
            ) : (
              <div className="dashboard-empty-row">
                <Users size={18} />
                <span>
                  <strong>No enquiries yet</strong>
                  <small>
                    New customer requests will appear here automatically.
                  </small>
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
      <div className="overview-grid bottom-overview">
        <section className="dash-card">
          <div className="dash-card-title">
            <div>
              <h2>Quote activity</h2>
              <p>Live proposal status</p>
            </div>
            <Link href="/dashboard/quotes">Manage quotes</Link>
          </div>
          <div className="activity-bars">
            <div>
              <span>Sent</span>
              <i>
                <b
                  style={{
                    width: `${Math.round((quoteStats.sent / maxQuoteStat) * 100)}%`,
                  }}
                />
              </i>
              <strong>{quoteStats.sent}</strong>
            </div>
            <div>
              <span>Viewed</span>
              <i>
                <b
                  style={{
                    width: `${Math.round((quoteStats.viewed / maxQuoteStat) * 100)}%`,
                  }}
                />
              </i>
              <strong>{quoteStats.viewed}</strong>
            </div>
            <div>
              <span>Accepted</span>
              <i>
                <b
                  style={{
                    width: `${Math.round((quoteStats.accepted / maxQuoteStat) * 100)}%`,
                  }}
                />
              </i>
              <strong>{quoteStats.accepted}</strong>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Enquiries({
  openQuote,
  showToast,
}: {
  openQuote: () => void;
  showToast: (message: string) => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="Client pipeline"
        title="Enquiries"
        text="Review new requests and turn great-fit couples into bookings."
        action={
          <button
            className="filter-button"
            onClick={() => showToast("Showing all enquiries")}
          >
            All enquiries <ChevronDown size={16} />
          </button>
        }
      />
      <div className="lead-board">
        {leads.map((lead, index) => (
          <article key={lead.name}>
            <div className="lead-score">
              <span>{index === 0 ? "Great fit" : "New"}</span>
              <small>{lead.age} ago</small>
            </div>
            <span className={`lead-avatar large ${lead.tone}`}>
              {lead.initials}
            </span>
            <h3>{lead.name}</h3>
            <p>{lead.service}</p>
            <dl>
              <div>
                <dt>Wedding</dt>
                <dd>{lead.date}</dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>{lead.budget}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{index === 1 ? "Abuja" : "Lagos"}</dd>
              </div>
            </dl>
            <p className="lead-note">
              “We love your modern traditional style and would like help
              bringing our reception together…”
            </p>
            <div>
              <button
                onClick={() => showToast(`Reply started for ${lead.name}`)}
              >
                <MessageSquare size={16} /> Reply
              </button>
              <button onClick={openQuote}>
                <FileText size={16} /> Create quote
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function Quotes({
  quotes,
  openQuote,
}: {
  quotes: typeof initialQuotes;
  openQuote: (quote?: (typeof initialQuotes)[number]) => void;
}) {
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const selectedStatus = status === "Drafts" ? "Draft" : status;
  const filteredQuotes = quotes.filter(
    (quote) =>
      (status === "All" || quote.status === selectedStatus) &&
      (!query ||
        `${quote.title} ${quote.client} ${quote.id}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  return (
    <>
      <PageHeading
        eyebrow="Sales"
        title="Quotes"
        text="Create, amend and track every proposal."
        action={
          <button className="button button-primary" onClick={() => openQuote()}>
            <Plus size={17} /> New quote
          </button>
        }
      />
      <div className="quote-summary">
        <span>
          <strong>₦9.4m</strong>Open value
        </span>
        <span>
          <strong>7</strong>Accepted this month
        </span>
        <span>
          <strong>64%</strong>Acceptance rate
        </span>
        <span>
          <strong>1.8 days</strong>Average response
        </span>
      </div>
      <section className="dash-card quotes-table">
        <div className="table-toolbar">
          <div>
            {["All", "Drafts", "Sent", "Accepted"].map((item) => (
              <button
                key={item}
                className={status === item ? "active" : ""}
                onClick={() => setStatus(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <label>
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search quotes"
            />
          </label>
        </div>
        <div className="table-head">
          <span>Quote</span>
          <span>Client</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Date</span>
          <span />
        </div>
        {filteredQuotes.map((quote) => (
          <div className="table-row" key={quote.id}>
            <span>
              <strong>{quote.title}</strong>
              <small>{quote.id}</small>
            </span>
            <span>{quote.client}</span>
            <strong>₦{quote.amount.toLocaleString("en-NG")}</strong>
            <span>
              <i className={`status-dot ${quote.status.toLowerCase()}`} />
              {quote.status}
            </span>
            <span>{quote.date}</span>
            <button onClick={() => openQuote(quote)}>
              <Pencil size={16} /> Edit
            </button>
          </div>
        ))}
      </section>
    </>
  );
}

function Messages({
  selected,
  setSelected,
  emailText,
  setEmailText,
  showToast,
}: {
  selected: number;
  setSelected: (value: number) => void;
  emailText: string;
  setEmailText: (value: string) => void;
  showToast: (message: string) => void;
}) {
  const active = messages[selected];
  return (
    <>
      <PageHeading
        eyebrow="Inbox"
        title="Client messages"
        text="Keep every wedding conversation organised."
      />
      <section className="inbox-shell">
        <aside>
          <div className="inbox-search">
            <Search size={16} />
            <input placeholder="Search messages" />
          </div>
          {messages.map((message, index) => (
            <button
              key={message.name}
              className={selected === index ? "active" : ""}
              onClick={() => setSelected(index)}
            >
              <span>{message.initials}</span>
              <div>
                <strong>{message.name}</strong>
                <small>{message.subject}</small>
                <p>{message.text}</p>
              </div>
              <time>{message.time}</time>
              {message.unread && <i />}
            </button>
          ))}
        </aside>
        <article className="message-panel">
          <header>
            <div>
              <span>{active.initials}</span>
              <div>
                <strong>{active.name}</strong>
                <small>{active.subject}</small>
              </div>
            </div>
            <button
              onClick={() =>
                showToast(`${active.name} conversation menu opened`)
              }
            >
              <MoreHorizontal />
            </button>
          </header>
          <div className="message-history">
            <div>
              <small>Today, 10:42</small>
              <p>{active.text}</p>
            </div>
            <div className="sent-message">
              <small>You · 10:18</small>
              <p>
                Thanks for coming back to me. I’m reviewing the alternative
                options now and will confirm what works best.
              </p>
            </div>
          </div>
          <div className="email-composer">
            <div className="composer-tools">
              <button onClick={() => showToast("Reply mode selected")}>
                Reply
              </button>
              <button
                onClick={() =>
                  setEmailText(
                    "Hi there,\n\nThank you for getting in touch.\n\nWarmly,\nAdaeze",
                  )
                }
              >
                Templates
              </button>
              <button
                onClick={() =>
                  setEmailText(
                    "Hi Amara,\n\nThank you for the update. I’ve reviewed your request and can confirm the alternative works beautifully with your existing concept.\n\nWarmly,\nAdaeze",
                  )
                }
              >
                <Sparkles size={14} /> Improve with AI
              </button>
            </div>
            <textarea
              value={emailText}
              onChange={(event) => setEmailText(event.target.value)}
            />
            <footer>
              <span>Email will be sent from hello@auroraevents.ng</span>
              <button
                className="button button-primary button-small"
                onClick={() => showToast(`Email sent to ${active.name}`)}
              >
                <Send size={15} /> Send email
              </button>
            </footer>
          </div>
        </article>
      </section>
    </>
  );
}
