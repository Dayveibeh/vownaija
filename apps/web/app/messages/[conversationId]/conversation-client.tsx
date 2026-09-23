"use client";

import Link from "next/link";
import {
  ArrowLeft, CalendarCheck2, CalendarDays, Check, ChevronRight, Clock3,
  FileText, MapPin, Plus, Send, Sparkles, Trash2, X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatNaira } from "@smitten/shared";
import type { ConversationDetail } from "@/lib/messaging";
import type { QuoteView } from "@/lib/quotes";
import { Brand } from "../../components/Brand";
import { SessionAccountNav } from "../../components/SessionAccountNav";

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
function dateLabel(value: string | null) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value + "T12:00:00"));
}
function quoteStatus(status: QuoteView["status"]) {
  return status === "accepted" ? "Accepted" : status === "declined" ? "Declined" : status === "expired" ? "Expired" : status === "viewed" ? "Viewed" : "Sent";
}

type LineItem = { title: string; description: string; quantity: number; unitPrice: number };

export default function ConversationClient({
  initialConversation,
  role,
}: {
  initialConversation: ConversationDetail;
  role: "couple" | "vendor" | "admin";
}) {
  const [conversation, setConversation] = useState(initialConversation);
  const [quotes, setQuotes] = useState<QuoteView[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteTitle, setQuoteTitle] = useState(initialConversation.packageTitle || initialConversation.requestedService || "Custom wedding package");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState(0);
  const [fees, setFees] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { title: initialConversation.packageTitle || initialConversation.requestedService || "Wedding service", description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [respondingQuoteId, setRespondingQuoteId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isVendor = role !== "couple";
  const otherName = role === "couple" ? conversation.vendorName : conversation.customerName;
  const backHref = role === "couple" ? "/couples/messages" : "/dashboard/messages";
  const hasBooking = quotes.some((quote) => quote.status === "accepted");

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1) * Math.max(0, Number(item.unitPrice) || 0), 0),
    [lineItems],
  );
  const quoteTotal = Math.max(0, subtotal - Math.max(0, Number(discount) || 0) + Math.max(0, Number(fees) || 0));

  const meta = useMemo(() => [
    conversation.weddingDate ? { icon: CalendarDays, text: dateLabel(conversation.weddingDate) } : null,
    { icon: MapPin, text: conversation.weddingLocation },
  ].filter(Boolean) as Array<{ icon: typeof CalendarDays; text: string }>, [conversation.weddingDate, conversation.weddingLocation]);

  async function refresh() {
    const [messagesResponse, quotesResponse] = await Promise.all([
      fetch(`/api/conversations/${conversation.id}/messages`, { cache: "no-store" }),
      fetch(`/api/conversations/${conversation.id}/quotes`, { cache: "no-store" }),
    ]);
    if (messagesResponse.ok) {
      const result = await messagesResponse.json();
      if (result?.conversation) setConversation(result.conversation);
    }
    if (quotesResponse.ok) {
      const result = await quotesResponse.json();
      if (Array.isArray(result?.quotes)) setQuotes(result.quotes);
    }
  }

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 8000);
    return () => window.clearInterval(timer);
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.messages.length, quotes.length]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const message = body.trim();
    if (!message || sending) return;
    setError(""); setSending(true);
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Message failed");
      setBody("");
      await refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "We couldn’t send that message.");
    } finally { setSending(false); }
  }

  function addLineItem(prefill?: Partial<LineItem>) {
    setLineItems((current) => [...current, {
      title: prefill?.title ?? "",
      description: prefill?.description ?? "",
      quantity: prefill?.quantity ?? 1,
      unitPrice: prefill?.unitPrice ?? 0,
    }]);
  }
  function updateLineItem(index: number, patch: Partial<LineItem>) {
    setLineItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }
  function removeLineItem(index: number) {
    setLineItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function sendQuote(event: FormEvent) {
    event.preventDefault();
    setQuoteError("");
    if (!quoteTitle.trim() || lineItems.some((item) => !item.title.trim() || Number(item.unitPrice) < 0) || quoteTotal <= 0) {
      setQuoteError("Add a quote title and at least one priced service.");
      return;
    }
    setQuoteSaving(true);
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quoteTitle,
          notes: quoteNotes || null,
          validUntil: validUntil || null,
          discountAmount: Number(discount) || 0,
          additionalFees: Number(fees) || 0,
          items: lineItems.map((item) => ({
            title: item.title,
            description: item.description || null,
            quantity: Math.max(1, Number(item.quantity) || 1),
            unitPrice: Math.max(0, Number(item.unitPrice) || 0),
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "We couldn’t send the quote.");
      setQuoteOpen(false);
      setQuoteNotes(""); setDiscount(0); setFees(0); setValidUntil("");
      setLineItems([{ title: conversation.packageTitle || conversation.requestedService || "Wedding service", description: "", quantity: 1, unitPrice: 0 }]);
      await refresh();
    } catch (quoteSendError) {
      setQuoteError(quoteSendError instanceof Error ? quoteSendError.message : "We couldn’t send the quote.");
    } finally { setQuoteSaving(false); }
  }

  async function respondToQuote(quoteId: string, action: "accept" | "decline") {
    setRespondingQuoteId(quoteId); setError("");
    try {
      const response = await fetch(`/api/quotes/${quoteId}/respond`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "We couldn’t update the quote.");
      await refresh();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : "We couldn’t update the quote.");
    } finally { setRespondingQuoteId(""); }
  }

  const timeline = useMemo(() => {
    const messages = conversation.messages.map((message) => ({ type: "message" as const, at: message.createdAt, message }));
    const quoteEvents = quotes.map((quote) => ({ type: "quote" as const, at: quote.sentAt, quote }));
    return [...messages, ...quoteEvents].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [conversation.messages, quotes]);

  return (
    <main className="conversation-page">
      <header className="conversation-topbar">
        <Brand />
        <Link href={backHref} className="conversation-back"><ArrowLeft size={16} /> Inbox</Link>
        <SessionAccountNav variant="compact" />
      </header>

      <section className="conversation-shell">
        <aside className="conversation-summary">
          <p className="eyebrow"><span /> Wedding enquiry</p>
          <h1>{otherName}</h1>
          <div className="conversation-meta">{meta.map(({ icon: Icon, text }) => <span key={text}><Icon size={16} /> {text}</span>)}</div>
          <div className="conversation-detail-card">
            <small>Service</small><strong>{conversation.packageTitle || conversation.requestedService || "Custom wedding enquiry"}</strong>
            {conversation.guestCount && <p>{conversation.guestCount} guests</p>}
            {conversation.budgetBand && <p>{conversation.budgetBand} budget</p>}
          </div>
          {hasBooking ? <div className="conversation-booked"><CalendarCheck2 /><span><strong>Booking confirmed</strong><small>This enquiry now has an accepted quote.</small></span></div>
            : <div className="conversation-status"><i /><span><strong>{conversation.status === "new" ? "New enquiry" : "Conversation active"}</strong><small>Keep all decisions here so nothing gets lost.</small></span></div>}
          {isVendor && !hasBooking && <button className="conversation-create-quote" onClick={() => setQuoteOpen(true)}><FileText size={16} /> Create quote</button>}
        </aside>

        <section className="conversation-thread">
          <header>
            <div><span className="conversation-person-avatar">{otherName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div><strong>{otherName}</strong><small>{role === "couple" ? "Wedding vendor" : conversation.customerEmail}</small></div></div>
            {isVendor && !hasBooking ? <button className="thread-quote-button" onClick={() => setQuoteOpen(true)}><Plus size={15} /> Create quote</button> : <span className="conversation-live"><i /> Smitten conversation</span>}
          </header>

          <div className="conversation-messages">
            <div className="conversation-origin"><Sparkles size={15} /><span>Enquiry created · {dateLabel(conversation.weddingDate)}</span></div>
            {timeline.map((item) => item.type === "message" ? (
              <article key={`message-${item.message.id}`} className={item.message.mine ? "message-bubble mine" : "message-bubble"}>
                {!item.message.mine && <strong>{item.message.senderName}</strong>}<p>{item.message.body}</p><time>{timeLabel(item.message.createdAt)}</time>
              </article>
            ) : (
              <article className={`conversation-quote-card status-${item.quote.status}`} key={`quote-${item.quote.id}`}>
                <header><span><FileText size={17} /><small>Quote · Revision {item.quote.revision}</small></span><b>{quoteStatus(item.quote.status)}</b></header>
                <h3>{item.quote.title}</h3>
                <div className="conversation-quote-lines">
                  {item.quote.items.map((line) => <div key={line.id}><span><strong>{line.title}</strong>{line.description && <small>{line.description}</small>}</span><span>{line.quantity > 1 && <small>{line.quantity} × </small>}{formatNaira(line.unitPrice)}</span></div>)}
                </div>
                <div className="conversation-quote-totals">
                  <span>Subtotal <strong>{formatNaira(item.quote.subtotal)}</strong></span>
                  {item.quote.discountAmount > 0 && <span>Discount <strong>−{formatNaira(item.quote.discountAmount)}</strong></span>}
                  {item.quote.additionalFees > 0 && <span>Additional fees <strong>{formatNaira(item.quote.additionalFees)}</strong></span>}
                  <span className="total">Total <strong>{formatNaira(item.quote.total)}</strong></span>
                </div>
                {item.quote.notes && <p className="conversation-quote-notes">{item.quote.notes}</p>}
                <footer>
                  <span>{item.quote.validUntil ? <><Clock3 size={13} /> Valid until {dateLabel(item.quote.validUntil)}</> : "No expiry date"}</span>
                  {role === "couple" && ["sent","viewed"].includes(item.quote.status) && !hasBooking ? <div><button className="decline" disabled={respondingQuoteId === item.quote.id} onClick={() => void respondToQuote(item.quote.id, "decline")}>Decline</button><button className="accept" disabled={respondingQuoteId === item.quote.id} onClick={() => void respondToQuote(item.quote.id, "accept")}>{respondingQuoteId === item.quote.id ? "Updating…" : "Accept quote"} <Check size={15} /></button></div> : null}
                  {item.quote.status === "accepted" && <Link href={role === "couple" ? "/couples/bookings" : "/dashboard/bookings"}>View booking <ChevronRight size={14} /></Link>}
                </footer>
              </article>
            ))}
            <div ref={bottomRef} />
          </div>

          <form className="conversation-composer" onSubmit={sendMessage}>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Message ${otherName}…`} rows={3} maxLength={3000} />
            <div><span>{error || "Messages, quotes and booking decisions stay with this enquiry."}</span><button type="submit" disabled={sending || !body.trim()}>{sending ? "Sending…" : "Send"} <Send size={16} /></button></div>
          </form>
        </section>
      </section>

      {quoteOpen && <div className="quote-builder-backdrop" onMouseDown={() => setQuoteOpen(false)}>
        <section className="quote-builder" role="dialog" aria-modal="true" aria-label="Create quote" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><p className="eyebrow"><span /> Personal quote</p><h2>Quote for {conversation.customerName}</h2><p>Build a clear itemised proposal. It will appear instantly in this conversation.</p></div><button onClick={() => setQuoteOpen(false)} aria-label="Close quote builder"><X /></button></header>
          <form onSubmit={sendQuote}>
            <label className="quote-builder-field">Quote title<input value={quoteTitle} onChange={(event) => setQuoteTitle(event.target.value)} required placeholder="e.g. Full Celebration Package" /></label>
            <div className="quote-builder-items">
              <div className="quote-builder-section-title"><span><strong>Services & bespoke charges</strong><small>Add the core package, optional extras or any one-off custom service. Each item appears separately on the couple’s quote and PDF.</small></span><div className="quote-builder-add-actions"><button type="button" onClick={() => addLineItem()}><Plus size={14} /> Add service</button><button type="button" className="bespoke" onClick={() => addLineItem({ title: "Bespoke service" })}><Sparkles size={14} /> Add bespoke charge</button></div></div>
              {lineItems.map((item, index) => <article key={index}>
                <div className="quote-item-main"><label>Service / charge<input value={item.title} onChange={(event) => updateLineItem(index, { title: event.target.value })} required placeholder="e.g. Additional coordination hours" /></label><label>Description<input value={item.description} onChange={(event) => updateLineItem(index, { description: event.target.value })} placeholder="Explain what this covers (optional)" /></label></div>
                <label>Qty<input type="number" min="1" value={item.quantity} onChange={(event) => updateLineItem(index, { quantity: Number(event.target.value) })} /></label>
                <label>Price (₦)<input type="number" min="0" step="1" value={item.unitPrice || ""} onChange={(event) => updateLineItem(index, { unitPrice: Number(event.target.value) })} required placeholder="0" /></label>
                <button type="button" className="quote-remove-item" onClick={() => removeLineItem(index)} disabled={lineItems.length === 1} aria-label="Remove item"><Trash2 size={16} /></button>
              </article>)}
            </div>
            <div className="quote-builder-adjustments"><label>Discount (₦)<input type="number" min="0" step="1" value={discount || ""} onChange={(event) => setDiscount(Number(event.target.value))} placeholder="0" /></label><label>Additional fees (₦)<input type="number" min="0" step="1" value={fees || ""} onChange={(event) => setFees(Number(event.target.value))} placeholder="0" /></label><label>Valid until<input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></label></div>
            <label className="quote-builder-field">Note to the couple<textarea rows={3} value={quoteNotes} onChange={(event) => setQuoteNotes(event.target.value)} placeholder="Optional payment schedule, inclusions or helpful context…" /></label>
            <div className="quote-builder-summary"><span>Subtotal <strong>{formatNaira(subtotal)}</strong></span>{discount > 0 && <span>Discount <strong>−{formatNaira(discount)}</strong></span>}{fees > 0 && <span>Additional fees <strong>{formatNaira(fees)}</strong></span>}<span className="total">Quote total <strong>{formatNaira(quoteTotal)}</strong></span></div>
            {quoteError && <p className="quote-builder-error">{quoteError}</p>}
            <footer><button type="button" onClick={() => setQuoteOpen(false)}>Cancel</button><button type="submit" disabled={quoteSaving}>{quoteSaving ? "Sending quote…" : "Send quote"} <Send size={15} /></button></footer>
          </form>
        </section>
      </div>}
    </main>
  );
}
