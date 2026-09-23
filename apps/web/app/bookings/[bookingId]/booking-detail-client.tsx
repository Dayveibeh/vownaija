"use client";

import Link from "next/link";
import { ArrowLeft, CalendarCheck2, Download, FileText, MapPin, MessageSquare } from "lucide-react";
import { formatNaira } from "@smitten/shared";
import type { BookingView, QuoteView } from "@/lib/quotes";
import { Brand } from "../../components/Brand";
import { SessionAccountNav } from "../../components/SessionAccountNav";

function dateLabel(value: string | null) {
  if (!value) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value + "T12:00:00"));
}

export default function BookingDetailClient({
  booking,
  quote,
  role,
}: {
  booking: BookingView;
  quote: QuoteView;
  role: "couple" | "vendor" | "admin";
}) {
  const isCustomer = role === "couple";
  const backHref = isCustomer ? "/couples/bookings" : "/dashboard/bookings";
  const counterparty = isCustomer ? booking.vendorName : booking.customerName;

  return (
    <main className="booking-detail-page">
      <header className="quote-detail-topbar">
        <Brand />
        <Link href={backHref}><ArrowLeft size={16} /> Back to bookings</Link>
        <SessionAccountNav variant="compact" />
      </header>

      <section className="booking-detail-shell">
        <aside className="booking-summary-card">
          <p className="eyebrow"><span /> Confirmed booking</p>
          <h1>{booking.serviceSummary}</h1>
          <p>{counterparty}</p>

          <div className="booking-status-panel">
            <CalendarCheck2 />
            <div><strong>Booking confirmed</strong><small>Accepted through Smitten</small></div>
          </div>

          <div className="booking-summary-meta">
            <span><MapPin size={16} /><small>Location</small><strong>{booking.weddingLocation}</strong></span>
            <span><CalendarCheck2 size={16} /><small>Wedding date</small><strong>{dateLabel(booking.weddingDate)}</strong></span>
            <span><FileText size={16} /><small>Booking total</small><strong>{formatNaira(booking.total)}</strong></span>
          </div>

          <a className="quote-download-button" href={`/api/quotes/${booking.quoteId}/pdf`} download>
            <Download size={17} /> Download quote PDF
          </a>
          <Link className="quote-conversation-link" href={`/messages/${booking.conversationId}`}>
            <MessageSquare size={16} /> Open conversation
          </Link>
        </aside>

        <article className="booking-document">
          <header>
            <div>
              <p>Smitten booking</p>
              <h2>{booking.serviceSummary}</h2>
              <span>{booking.vendorName} · {booking.customerName}</span>
            </div>
            <b>{booking.status}</b>
          </header>

          <section className="booking-highlight-grid">
            <div><small>Wedding date</small><strong>{dateLabel(booking.weddingDate)}</strong></div>
            <div><small>Location</small><strong>{booking.weddingLocation}</strong></div>
            <div><small>Confirmed total</small><strong>{formatNaira(booking.total)}</strong></div>
          </section>

          <section className="booking-accepted-quote">
            <div className="booking-section-heading">
              <div><p className="eyebrow"><span /> Accepted quote</p><h3>{quote.title}</h3></div>
              <Link href={`/quotes/${quote.id}`}>View full quote</Link>
            </div>

            <div className="quote-document-items booking-quote-items">
              <div className="quote-document-table-head"><span>Service</span><span>Qty</span><span>Unit price</span><span>Total</span></div>
              {quote.items.map((item) => <div className="quote-document-line" key={item.id}>
                <span><strong>{item.title}</strong>{item.description && <small>{item.description}</small>}</span>
                <span>{item.quantity}</span>
                <span>{formatNaira(item.unitPrice)}</span>
                <strong>{formatNaira(item.lineTotal)}</strong>
              </div>)}
            </div>

            <div className="quote-document-totals booking-totals">
              <span>Subtotal <strong>{formatNaira(quote.subtotal)}</strong></span>
              {quote.discountAmount > 0 && <span>Discount <strong>−{formatNaira(quote.discountAmount)}</strong></span>}
              {quote.additionalFees > 0 && <span>Additional fees <strong>{formatNaira(quote.additionalFees)}</strong></span>}
              <span className="grand-total">Total <strong>{formatNaira(quote.total)}</strong></span>
            </div>

            {quote.notes && <div className="booking-note"><small>Vendor note</small><p>{quote.notes}</p></div>}
          </section>

          <footer>
            <span>Confirmed {new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(booking.confirmedAt))}</span>
            <a href={`/api/quotes/${booking.quoteId}/pdf`} download><Download size={15} /> Download accepted quote</a>
          </footer>
        </article>
      </section>
    </main>
  );
}
