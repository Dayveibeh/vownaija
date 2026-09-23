"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, Clock3, Download, FileText, MapPin, MessageSquare, X } from "lucide-react";
import { formatNaira } from "@smitten/shared";
import { useState } from "react";
import type { QuoteView } from "@/lib/quotes";
import { Brand } from "../../components/Brand";
import { SessionAccountNav } from "../../components/SessionAccountNav";

function dateLabel(value: string | null) {
  if (!value) return "Not specified";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value + "T12:00:00"));
}

export default function QuoteDetailClient({
  quote: initialQuote,
  role,
}: {
  quote: QuoteView;
  role: "couple" | "vendor" | "admin";
}) {
  const [quote, setQuote] = useState(initialQuote);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState("");
  const isCustomer = role === "couple";
  const backHref = isCustomer ? "/couples/quotes" : "/dashboard/quotes";

  async function respond(action: "accept" | "decline") {
    setResponding(true);
    setError("");
    try {
      const response = await fetch(`/api/quotes/${quote.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "We couldn’t update this quote.");
      setQuote((current) => ({ ...current, status: action === "accept" ? "accepted" : "declined", respondedAt: new Date().toISOString() }));
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : "We couldn’t update this quote.");
    } finally {
      setResponding(false);
    }
  }

  return (
    <main className="quote-detail-page">
      <header className="quote-detail-topbar">
        <Brand />
        <Link href={backHref}><ArrowLeft size={16} /> Back to quotes</Link>
        <SessionAccountNav variant="compact" />
      </header>

      <section className="quote-detail-shell">
        <aside className="quote-detail-meta">
          <p className="eyebrow"><span /> Quote details</p>
          <h1>{quote.title}</h1>
          <p>{isCustomer ? quote.vendorName : quote.customerName}</p>

          <div className="quote-detail-meta-card">
            <span><FileText size={16} /><small>Quote</small><strong>#{quote.id.slice(0, 8).toUpperCase()}</strong></span>
            <span><Clock3 size={16} /><small>Valid until</small><strong>{quote.validUntil ? dateLabel(quote.validUntil) : "No expiry"}</strong></span>
            <span><CalendarDays size={16} /><small>Revision</small><strong>{quote.revision}</strong></span>
          </div>

          <a className="quote-download-button" href={`/api/quotes/${quote.id}/pdf`} download>
            <Download size={17} /> Download PDF
          </a>
          <Link className="quote-conversation-link" href={`/messages/${quote.conversationId}`}>
            <MessageSquare size={16} /> Open conversation
          </Link>
        </aside>

        <article className="quote-document">
          <header>
            <div>
              <p>Smitten wedding quote</p>
              <h2>{quote.title}</h2>
              <span>Prepared by {quote.vendorName} for {quote.customerName}</span>
            </div>
            <b className={`quote-detail-status ${quote.status}`}>{quote.status}</b>
          </header>

          <section className="quote-document-items">
            <div className="quote-document-table-head"><span>Service</span><span>Qty</span><span>Unit price</span><span>Total</span></div>
            {quote.items.map((item) => <div className="quote-document-line" key={item.id}>
              <span><strong>{item.title}</strong>{item.description && <small>{item.description}</small>}</span>
              <span>{item.quantity}</span>
              <span>{formatNaira(item.unitPrice)}</span>
              <strong>{formatNaira(item.lineTotal)}</strong>
            </div>)}
          </section>

          <section className="quote-document-totals">
            <span>Subtotal <strong>{formatNaira(quote.subtotal)}</strong></span>
            {quote.discountAmount > 0 && <span>Discount <strong>−{formatNaira(quote.discountAmount)}</strong></span>}
            {quote.additionalFees > 0 && <span>Additional fees <strong>{formatNaira(quote.additionalFees)}</strong></span>}
            <span className="grand-total">Total <strong>{formatNaira(quote.total)}</strong></span>
          </section>

          {quote.notes && <section className="quote-document-notes"><small>Note from {quote.vendorName}</small><p>{quote.notes}</p></section>}

          <footer>
            <div><span><MapPin size={14} /> Smitten marketplace</span><span>All amounts are in Nigerian Naira (NGN).</span></div>
            {isCustomer && ["sent","viewed"].includes(quote.status) && <div className="quote-detail-actions">
              <button className="decline" disabled={responding} onClick={() => void respond("decline")}><X size={15} /> Decline</button>
              <button className="accept" disabled={responding} onClick={() => void respond("accept")}>{responding ? "Updating…" : "Accept quote"} <Check size={15} /></button>
            </div>}
            {quote.status === "accepted" && <div className="quote-accepted-banner"><Check size={16} /> Quote accepted — your booking is confirmed.</div>}
            {error && <p className="quote-detail-error">{error}</p>}
          </footer>
        </article>
      </section>
    </main>
  );
}
