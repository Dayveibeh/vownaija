"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileText,
  ImagePlus,
  Instagram,
  LayoutDashboard,
  Mail,
  Menu,
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
  Upload,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Brand } from "../components/Brand";

type Tab = "Overview" | "Enquiries" | "Quotes" | "Messages" | "Portfolio" | "Reviews";

const leads = [
  { initials: "AO", name: "Amara & Tunde", service: "Full wedding planning", date: "18 Dec 2026", budget: "₦3m–₦5m", age: "12m", tone: "peach" },
  { initials: "NI", name: "Nneka & Ifeanyi", service: "Reception décor", date: "24 Jan 2027", budget: "₦1m–₦3m", age: "1h", tone: "green" },
  { initials: "ZM", name: "Zainab & Musa", service: "Wedding day coordination", date: "04 Apr 2027", budget: "₦500k–₦1m", age: "3h", tone: "gold" },
];

const initialQuotes = [
  { id: "SM-1042", client: "Amara & Tunde", title: "Full Celebration Package", amount: 3750000, status: "Viewed", date: "12 Aug 2026" },
  { id: "SM-1039", client: "Nneka & Ifeanyi", title: "Signature Styling", amount: 1250000, status: "Sent", date: "10 Aug 2026" },
  { id: "SM-1034", client: "Bisi & Femi", title: "Day Coordination", amount: 650000, status: "Accepted", date: "06 Aug 2026" },
  { id: "SM-1028", client: "Zainab & Musa", title: "Traditional Wedding Décor", amount: 980000, status: "Draft", date: "02 Aug 2026" },
];

const messages = [
  { initials: "AO", name: "Amara Okoye", subject: "Full Celebration quote", text: "Thank you for sending this over! Could we swap the floral arch…", time: "10:42", unread: true },
  { initials: "NI", name: "Nneka Ibe", subject: "Reception décor", text: "Hi Adaeze, the venue confirmed we can access from 8am.", time: "Yesterday", unread: true },
  { initials: "BF", name: "Bisi Falana", subject: "Final timeline", text: "Everything looks perfect. See you on Saturday!", time: "Mon", unread: false },
];

const portfolioImages = [
  "https://ikejabird.com/wp-content/uploads/2025/10/2022-02-01-1.jpg",
  "https://naphtalirentals.com/wp-content/uploads/2022/07/291952015_993524448004434_4768468144911484061_n.jpg",
  "https://www.eventdesignbybe.com/wp-content/uploads/2024/08/Modern-Nigerian-Wedding-Cake-Designs.jpg",
];

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [editQuote, setEditQuote] = useState<(typeof initialQuotes)[number] | null>(null);
  const [lineItems, setLineItems] = useState([{ description: "Planning and creative direction", amount: 1200000 }, { description: "Décor production and installation", amount: 1850000 }, { description: "On-the-day coordination", amount: 450000 }]);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState(["Hi Adaeze — I can help you draft replies, improve quotes or plan your week. What are we working on?"]);
  const [aiInput, setAiInput] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(0);
  const [emailText, setEmailText] = useState("Hi Amara,\n\nThank you for your message. We can absolutely swap the floral arch for a soft fabric installation and keep the same colour direction. I’ll update your quote and send it across this afternoon.\n\nWarmly,\nAdaeze");
  const [toast, setToast] = useState("");
  const [uploaded, setUploaded] = useState<string[]>([]);

  const quoteTotal = useMemo(() => lineItems.reduce((total, item) => total + Number(item.amount || 0), 0), [lineItems]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2800);
  }

  function openQuote(quote?: (typeof initialQuotes)[number]) {
    setEditQuote(quote ?? null);
    if (quote) setLineItems([{ description: quote.title, amount: quote.amount }]);
    else setLineItems([{ description: "Planning and creative direction", amount: 1200000 }, { description: "Décor production and installation", amount: 1850000 }]);
    setQuoteOpen(true);
  }

  function saveQuote(event: FormEvent, sendNow = false) {
    event.preventDefault();
    if (editQuote) {
      setQuotes((current) => current.map((quote) => quote.id === editQuote.id ? { ...quote, amount: quoteTotal, status: sendNow ? "Sent" : quote.status } : quote));
    } else {
      setQuotes((current) => [{ id: `SM-${1043 + current.length}`, client: "Amara & Tunde", title: "Custom Wedding Package", amount: quoteTotal, status: sendNow ? "Sent" : "Draft", date: "13 Aug 2026" }, ...current]);
    }
    setQuoteOpen(false);
    showToast(sendNow ? "Quote sent to the client" : "Quote saved as a draft");
  }

  function askAi(prompt?: string) {
    const question = prompt || aiInput.trim();
    if (!question) return;
    setAiMessages((current) => [...current, question, "Here’s a polished response you can use: “Thanks for sharing the update. I’ve noted the venue access time and will revise the production schedule so every supplier is aligned. I’ll send the final timeline by 4pm today.”"]);
    setAiInput("");
  }

  return (
    <main className="dashboard-shell">
      <aside className={mobileNav ? "dashboard-sidebar mobile-open" : "dashboard-sidebar"}>
        <div className="dash-brand-row"><Brand /><button onClick={() => setMobileNav(false)}><X size={20} /></button></div>
        <div className="vendor-switcher"><span>AE</span><div><strong>Aurora Events NG</strong><small>Premium plan</small></div><ChevronDown size={16} /></div>
        <nav>
          <small>Workspace</small>
          <button className={tab === "Overview" ? "active" : ""} onClick={() => setTab("Overview")}><LayoutDashboard size={18} /> Overview</button>
          <button className={tab === "Enquiries" ? "active" : ""} onClick={() => setTab("Enquiries")}><Users size={18} /> Enquiries <span>3</span></button>
          <button className={tab === "Quotes" ? "active" : ""} onClick={() => setTab("Quotes")}><FileText size={18} /> Quotes</button>
          <button className={tab === "Messages" ? "active" : ""} onClick={() => setTab("Messages")}><Mail size={18} /> Messages <span>2</span></button>
          <small>Business</small>
          <button className={tab === "Portfolio" ? "active" : ""} onClick={() => setTab("Portfolio")}><ImagePlus size={18} /> Portfolio</button>
          <button className={tab === "Reviews" ? "active" : ""} onClick={() => setTab("Reviews")}><Star size={18} /> Reviews</button>
          <button onClick={() => showToast("Insights report opened")}><BarChart3 size={18} /> Insights</button>
        </nav>
        <div className="sidebar-bottom"><button onClick={() => showToast("Business settings opened")}><Settings size={18} /> Settings</button><Link href="/vendor/aurora-events"><ArrowRight size={17} /> View public profile</Link></div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar"><button className="dash-menu" onClick={() => setMobileNav(true)}><Menu /></button><div className="dash-search"><Search size={17} /><input placeholder="Search clients, quotes, messages…" /><kbd>⌘ K</kbd></div><div><button className="ai-top-button" onClick={() => setAiOpen(true)}><Sparkles size={16} /> Ask Smitten AI</button><button className="notification-button" onClick={() => showToast("You have 2 unread messages")}><Bell size={19} /><span /></button><span className="user-avatar">AO</span></div></header>

        <div className="dashboard-content">
          {tab === "Overview" && <Overview setTab={setTab} openQuote={() => openQuote()} showToast={showToast} />}
          {tab === "Enquiries" && <Enquiries openQuote={() => openQuote()} showToast={showToast} />}
          {tab === "Quotes" && <Quotes quotes={quotes} openQuote={openQuote} />}
          {tab === "Messages" && <Messages selected={selectedMessage} setSelected={setSelectedMessage} emailText={emailText} setEmailText={setEmailText} showToast={showToast} />}
          {tab === "Portfolio" && <Portfolio uploaded={uploaded} setUploaded={setUploaded} showToast={showToast} />}
          {tab === "Reviews" && <Reviews showToast={showToast} />}
        </div>
      </section>

      <button className="floating-ai" onClick={() => setAiOpen(true)} aria-label="Open AI assistant"><Sparkles size={20} /><span>Smitten AI</span></button>
      {aiOpen && <aside className="ai-panel">
        <header><div><span><Bot size={19} /></span><div><strong>Smitten AI</strong><small>Business co-pilot</small></div></div><button onClick={() => setAiOpen(false)}><X /></button></header>
        <div className="ai-thread">{aiMessages.map((message, index) => <div key={`${index}-${message.slice(0, 8)}`} className={index % 2 ? "ai-user-message" : "ai-bot-message"}>{index % 2 === 0 && <span><Sparkles size={14} /></span>}<p>{message}</p></div>)}</div>
        <div className="ai-suggestions"><button onClick={() => askAi("Draft a warm reply to my newest enquiry")}>Reply to an enquiry</button><button onClick={() => askAi("Suggest improvements to my latest quote")}>Improve a quote</button></div>
        <div className="ai-input"><input value={aiInput} onChange={(event) => setAiInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") askAi(); }} placeholder="Ask anything about your business…" /><button onClick={() => askAi()}><Send size={17} /></button></div>
      </aside>}

      {quoteOpen && <div className="quote-builder-backdrop" onMouseDown={() => setQuoteOpen(false)}><section className="quote-builder" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="step-label">{editQuote ? `Editing ${editQuote.id}` : "New custom quote"}</p><h2>{editQuote ? "Amend quote" : "Build a quote"}</h2></div><button onClick={() => setQuoteOpen(false)}><X /></button></header>
        <form onSubmit={(event) => saveQuote(event)}>
          <div className="quote-form-row"><label>Client<select defaultValue={editQuote?.client || "Amara & Tunde"}><option>Amara & Tunde</option><option>Nneka & Ifeanyi</option><option>Zainab & Musa</option></select></label><label>Valid until<input type="date" defaultValue="2026-08-27" /></label></div>
          <label>Quote title<input defaultValue={editQuote?.title || "Custom Wedding Package"} /></label>
          <div className="line-items-heading"><strong>Line items</strong><span>Amount</span></div>
          <div className="line-items">{lineItems.map((item, index) => <div key={index}><input value={item.description} onChange={(event) => setLineItems((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, description: event.target.value } : line))} /><div className="money-input"><span>₦</span><input type="number" value={item.amount} onChange={(event) => setLineItems((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, amount: Number(event.target.value) } : line))} /></div><button type="button" onClick={() => setLineItems((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 size={17} /></button></div>)}</div>
          <button className="add-line" type="button" onClick={() => setLineItems((current) => [...current, { description: "", amount: 0 }])}><Plus size={16} /> Add line item</button>
          <div className="quote-total"><span>Total</span><strong>₦{quoteTotal.toLocaleString("en-NG")}</strong></div>
          <label>Message to client<textarea rows={4} defaultValue="Thank you for considering Aurora Events. This quote has been tailored to your celebration and includes everything discussed." /></label>
          <div className="quote-builder-actions"><button className="save-draft" type="submit">Save draft</button><button className="button button-primary" type="button" onClick={(event) => saveQuote(event as unknown as FormEvent, true)}><Send size={17} /> Save & send quote</button></div>
        </form>
      </section></div>}

      {toast && <div className="dashboard-toast"><Check size={17} /> {toast}</div>}
    </main>
  );
}

function PageHeading({ eyebrow, title, text, action }: { eyebrow: string; title: string; text?: string; action?: React.ReactNode }) {
  return <div className="dash-page-heading"><div><p>{eyebrow}</p><h1>{title}</h1>{text && <span>{text}</span>}</div>{action}</div>;
}

function Overview({ setTab, openQuote, showToast }: { setTab: (tab: Tab) => void; openQuote: () => void; showToast: (message: string) => void }) {
  return <>
    <PageHeading eyebrow="Thursday, 13 August" title="Good afternoon, Adaeze" text="Here’s what’s happening with Aurora Events today." action={<button className="button button-primary" onClick={openQuote}><Plus size={17} /> Create quote</button>} />
    <div className="stat-grid"><article><span className="stat-icon coral"><Users /></span><div><p>New enquiries</p><strong>12</strong><small>↑ 20% this month</small></div></article><article><span className="stat-icon plum"><FileText /></span><div><p>Open quotes</p><strong>8</strong><small>₦9.4m potential</small></div></article><article><span className="stat-icon green"><CircleDollarSign /></span><div><p>Bookings</p><strong>5</strong><small>↑ 2 this month</small></div></article><article><span className="stat-icon gold"><Star /></span><div><p>Profile rating</p><strong>4.9</strong><small>86 reviews</small></div></article></div>
    <div className="overview-grid"><section className="dash-card recent-enquiries"><div className="dash-card-title"><div><h2>New enquiries</h2><p>Couples waiting to hear from you</p></div><button onClick={() => setTab("Enquiries")}>View all <ArrowRight size={15} /></button></div>{leads.map((lead) => <article key={lead.name}><span className={`lead-avatar ${lead.tone}`}>{lead.initials}</span><div><strong>{lead.name}</strong><small>{lead.service} · {lead.date}</small></div><span>{lead.budget}</span><small>{lead.age}</small><button onClick={() => showToast(`${lead.name} enquiry menu opened`)} aria-label={`Open ${lead.name} enquiry menu`}><MoreHorizontal /></button></article>)}</section><section className="dash-card profile-strength"><div className="dash-card-title"><div><h2>Profile strength</h2><p>You’re almost there</p></div><strong>82%</strong></div><div className="strength-bar"><span /></div><ul><li className="done"><Check /> Business details</li><li className="done"><Check /> Portfolio uploaded</li><li><Plus /> Add 2 more packages</li><li><Plus /> Connect TikTok</li></ul><button onClick={() => setTab("Portfolio")}>Complete profile <ArrowRight size={15} /></button></section></div>
    <div className="overview-grid bottom-overview"><section className="dash-card"><div className="dash-card-title"><div><h2>Quote activity</h2><p>Performance over the last 30 days</p></div><button onClick={() => setTab("Quotes")}>Manage quotes</button></div><div className="activity-bars"><div><span>Sent</span><i><b style={{ width: "86%" }} /></i><strong>14</strong></div><div><span>Viewed</span><i><b style={{ width: "67%" }} /></i><strong>11</strong></div><div><span>Accepted</span><i><b style={{ width: "41%" }} /></i><strong>7</strong></div></div></section><section className="dash-card ai-insight-card"><span><Sparkles /></span><p>Smitten’s tip</p><h3>Your quotes with a personal note are 34% more likely to be accepted.</h3><button onClick={() => setTab("Messages")}>See suggested template <ArrowRight size={15} /></button></section></div>
  </>;
}

function Enquiries({ openQuote, showToast }: { openQuote: () => void; showToast: (message: string) => void }) {
  return <><PageHeading eyebrow="Client pipeline" title="Enquiries" text="Review new requests and turn great-fit couples into bookings." action={<button className="filter-button" onClick={() => showToast("Showing all enquiries")}>All enquiries <ChevronDown size={16} /></button>} /><div className="lead-board">{leads.map((lead, index) => <article key={lead.name}><div className="lead-score"><span>{index === 0 ? "Great fit" : "New"}</span><small>{lead.age} ago</small></div><span className={`lead-avatar large ${lead.tone}`}>{lead.initials}</span><h3>{lead.name}</h3><p>{lead.service}</p><dl><div><dt>Wedding</dt><dd>{lead.date}</dd></div><div><dt>Budget</dt><dd>{lead.budget}</dd></div><div><dt>Location</dt><dd>{index === 1 ? "Abuja" : "Lagos"}</dd></div></dl><p className="lead-note">“We love your modern traditional style and would like help bringing our reception together…”</p><div><button onClick={() => showToast(`Reply started for ${lead.name}`)}><MessageSquare size={16} /> Reply</button><button onClick={openQuote}><FileText size={16} /> Create quote</button></div></article>)}</div></>;
}

function Quotes({ quotes, openQuote }: { quotes: typeof initialQuotes; openQuote: (quote?: (typeof initialQuotes)[number]) => void }) {
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const selectedStatus = status === "Drafts" ? "Draft" : status;
  const filteredQuotes = quotes.filter((quote) => (status === "All" || quote.status === selectedStatus) && (!query || `${quote.title} ${quote.client} ${quote.id}`.toLowerCase().includes(query.toLowerCase())));
  return <><PageHeading eyebrow="Sales" title="Quotes" text="Create, amend and track every proposal." action={<button className="button button-primary" onClick={() => openQuote()}><Plus size={17} /> New quote</button>} /><div className="quote-summary"><span><strong>₦9.4m</strong>Open value</span><span><strong>7</strong>Accepted this month</span><span><strong>64%</strong>Acceptance rate</span><span><strong>1.8 days</strong>Average response</span></div><section className="dash-card quotes-table"><div className="table-toolbar"><div>{["All", "Drafts", "Sent", "Accepted"].map((item) => <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>{item}</button>)}</div><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search quotes" /></label></div><div className="table-head"><span>Quote</span><span>Client</span><span>Amount</span><span>Status</span><span>Date</span><span /></div>{filteredQuotes.map((quote) => <div className="table-row" key={quote.id}><span><strong>{quote.title}</strong><small>{quote.id}</small></span><span>{quote.client}</span><strong>₦{quote.amount.toLocaleString("en-NG")}</strong><span><i className={`status-dot ${quote.status.toLowerCase()}`} />{quote.status}</span><span>{quote.date}</span><button onClick={() => openQuote(quote)}><Pencil size={16} /> Edit</button></div>)}</section></>;
}

function Messages({ selected, setSelected, emailText, setEmailText, showToast }: { selected: number; setSelected: (value: number) => void; emailText: string; setEmailText: (value: string) => void; showToast: (message: string) => void }) {
  const active = messages[selected];
  return <><PageHeading eyebrow="Inbox" title="Client messages" text="Keep every wedding conversation organised." /><section className="inbox-shell"><aside><div className="inbox-search"><Search size={16} /><input placeholder="Search messages" /></div>{messages.map((message, index) => <button key={message.name} className={selected === index ? "active" : ""} onClick={() => setSelected(index)}><span>{message.initials}</span><div><strong>{message.name}</strong><small>{message.subject}</small><p>{message.text}</p></div><time>{message.time}</time>{message.unread && <i />}</button>)}</aside><article className="message-panel"><header><div><span>{active.initials}</span><div><strong>{active.name}</strong><small>{active.subject}</small></div></div><button onClick={() => showToast(`${active.name} conversation menu opened`)}><MoreHorizontal /></button></header><div className="message-history"><div><small>Today, 10:42</small><p>{active.text}</p></div><div className="sent-message"><small>You · 10:18</small><p>Thanks for coming back to me. I’m reviewing the alternative options now and will confirm what works best.</p></div></div><div className="email-composer"><div className="composer-tools"><button onClick={() => showToast("Reply mode selected")}>Reply</button><button onClick={() => setEmailText("Hi there,\n\nThank you for getting in touch.\n\nWarmly,\nAdaeze")}>Templates</button><button onClick={() => setEmailText("Hi Amara,\n\nThank you for the update. I’ve reviewed your request and can confirm the alternative works beautifully with your existing concept.\n\nWarmly,\nAdaeze")}><Sparkles size={14} /> Improve with AI</button></div><textarea value={emailText} onChange={(event) => setEmailText(event.target.value)} /><footer><span>Email will be sent from hello@auroraevents.ng</span><button className="button button-primary button-small" onClick={() => showToast(`Email sent to ${active.name}`)}><Send size={15} /> Send email</button></footer></div></article></section></>;
}

function Portfolio({ uploaded, setUploaded, showToast }: { uploaded: string[]; setUploaded: (value: string[]) => void; showToast: (message: string) => void }) {
  return <><PageHeading eyebrow="Your storefront" title="Portfolio & social" text="Show couples what makes your work special." action={<label className="button button-primary upload-button"><Upload size={17} /> Upload media<input type="file" multiple accept="image/*,video/*" onChange={(event) => { const names = Array.from(event.target.files ?? []).map((file) => file.name); setUploaded([...uploaded, ...names]); showToast(`${names.length} media file${names.length === 1 ? "" : "s"} added`); }} /></label>} /><section className="portfolio-layout"><div className="dash-card portfolio-card"><div className="dash-card-title"><div><h2>Gallery</h2><p>12 photos · 3 videos</p></div><button onClick={() => showToast("Drag-to-reorder is ready in the production workspace")}>Reorder</button></div><div className="portfolio-grid">{portfolioImages.map((image, index) => <div key={image}><img src={image} alt={`Aurora Events portfolio ${index + 1}`} />{index === 1 && <span>Cover</span>}</div>)}{uploaded.map((name) => <div className="new-upload" key={name}><ImagePlus /><span>{name}</span></div>)}<label className="portfolio-add"><Plus /><span>Add media</span><input type="file" accept="image/*,video/*" onChange={(event) => { const name = event.target.files?.[0]?.name; if (name) { setUploaded([...uploaded, name]); showToast("Media added to your portfolio"); } }} /></label></div></div><aside><section className="dash-card social-card"><div className="dash-card-title"><div><h2>Social connections</h2><p>Help couples see more of your work</p></div></div><div><span className="instagram-icon"><Instagram /></span><p><strong>Instagram</strong><small>@auroraeventsng</small></p><i>Connected</i></div><div><span className="tiktok-icon">♪</span><p><strong>TikTok</strong><small>Not connected</small></p><button onClick={() => showToast("TikTok connection started")}>Connect</button></div><div><span className="whatsapp-icon">W</span><p><strong>WhatsApp</strong><small>+234 803 456 7890</small></p><i>Connected</i></div></section><section className="dash-card profile-copy-card"><div><Sparkles /></div><h3>Need help with your profile copy?</h3><p>Smitten AI can turn a few notes into an engaging business description in your voice.</p><button onClick={() => showToast("Smitten AI opened a profile-copy draft")}>Write with AI <ArrowRight size={15} /></button></section></aside></section></>;
}

function Reviews({ showToast }: { showToast: (message: string) => void }) {
  return <><PageHeading eyebrow="Reputation" title="Reviews" text="Build trust by celebrating feedback and responding thoughtfully." action={<button className="filter-button" onClick={() => showToast("Reviews sorted by newest first")}>Newest first <ChevronDown size={16} /></button>} /><div className="reviews-summary"><div><strong>4.9</strong><span><span>★★★★★</span>Based on 86 verified reviews</span></div><div><p><span>5</span><i><b style={{ width: "92%" }} /></i><strong>79</strong></p><p><span>4</span><i><b style={{ width: "8%" }} /></i><strong>7</strong></p><p><span>3</span><i><b style={{ width: "0%" }} /></i><strong>0</strong></p></div><p><Sparkles size={17} /><span><strong>Top compliment</strong>“Exceptional communication” appears in 64% of your reviews.</span></p></div><section className="review-management">{["Amara Okoye", "Nneka Chukwu"].map((name, index) => <article className="dash-card" key={name}><header><div><span>{index ? "NC" : "AO"}</span><p><strong>{name}</strong><small>{index ? "Married in Abuja · February 2026" : "Married in Lagos · May 2026"}</small></p></div><small>{index ? "4 days ago" : "Yesterday"}</small></header><div className="review-stars">★★★★★</div><h3>{index ? "Calm, creative and so organised" : "They understood the assignment"}</h3><p>{index ? "From the first call we felt looked after. Our families could enjoy the day because Aurora handled everything beautifully." : "Adaeze and her team brought our modern Yoruba wedding to life. Every detail was thoughtful and the day ran beautifully."}</p><button onClick={() => showToast(`Reply started for ${name}`)}><MessageSquare size={15} /> Reply publicly</button></article>)}</section></>;
}
