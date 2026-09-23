import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarCheck2, Clock3, FileText, MapPin } from "lucide-react";
import { formatNaira } from "@smitten/shared";
import type { BookingView, QuoteView } from "@/lib/quotes";
import { Brand } from "./Brand";
import { SessionAccountNav } from "./SessionAccountNav";

function dateLabel(value: string | null) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value + "T12:00:00"));
}

export function CommerceList({
  role,
  kind,
  quotes = [],
  bookings = [],
}: {
  role: "couple" | "vendor" | "admin";
  kind: "quotes" | "bookings";
  quotes?: QuoteView[];
  bookings?: BookingView[];
}) {
  const isVendor = role !== "couple";
  const items = kind === "quotes" ? quotes : bookings;
  const title = kind === "quotes" ? "Quotes" : "Bookings";
  const backHref = isVendor ? "/dashboard" : "/couples/dashboard";

  return (
    <main className="phase2-list-page">
      <header className="phase2-list-topbar"><Brand /><Link href={backHref}><ArrowLeft size={16} /> Dashboard</Link><SessionAccountNav variant="compact" /></header>
      <section className="phase2-list-wrap">
        <div className="phase2-list-heading">
          <div><p className="eyebrow"><span /> {isVendor ? "Vendor workspace" : "My wedding"}</p><h1>{title}</h1><p>{kind === "quotes" ? "Proposals and decisions stay connected to the original Smitten conversation." : "Accepted quotes become confirmed bookings automatically."}</p></div>
          <div className="phase2-list-count">{kind === "quotes" ? <FileText /> : <CalendarCheck2 />}<strong>{items.length}</strong><span>{items.length === 1 ? title.slice(0,-1).toLowerCase() : title.toLowerCase()}</span></div>
        </div>

        {items.length === 0 ? <section className="phase2-empty"><span>{kind === "quotes" ? <FileText /> : <CalendarCheck2 />}</span><h2>No {title.toLowerCase()} yet</h2><p>{kind === "quotes" ? (isVendor ? "Open an enquiry conversation to create and send your first quote." : "Quotes from vendors will appear here and inside the conversation.") : "When a customer accepts a quote, the confirmed booking will appear here."}</p><Link className="button button-primary" href={isVendor ? "/dashboard/enquiries" : "/"}>{isVendor ? "Open enquiries" : "Find vendors"} <ArrowRight size={16} /></Link></section>
        : <div className="commerce-list-grid">
          {kind === "quotes" ? quotes.map((quote) => <Link href={`/quotes/${quote.id}`} className="commerce-card" key={quote.id}>
            <header><span><FileText /><small>Revision {quote.revision}</small></span><b className={`commerce-status ${quote.status}`}>{quote.status}</b></header>
            <h2>{quote.title}</h2><p>{isVendor ? quote.customerName : quote.vendorName}</p>
            <div className="commerce-amount">{formatNaira(quote.total)}</div>
            <footer><span><Clock3 size={14} /> {quote.validUntil ? `Valid until ${dateLabel(quote.validUntil)}` : "No expiry date"}</span><ArrowRight size={16} /></footer>
          </Link>)
          : bookings.map((booking) => <Link href={`/bookings/${booking.id}`} className="commerce-card booking" key={booking.id}>
            <header><span><CalendarCheck2 /><small>Confirmed booking</small></span><b className="commerce-status accepted">{booking.status}</b></header>
            <h2>{booking.serviceSummary}</h2><p>{isVendor ? booking.customerName : booking.vendorName}</p>
            <div className="commerce-booking-meta"><span><MapPin size={14} /> {booking.weddingLocation}</span><span>{booking.weddingDate ? dateLabel(booking.weddingDate) : "Date to be confirmed"}</span></div>
            <div className="commerce-amount">{formatNaira(booking.total)}</div>
            <footer><span>Confirmed {new Intl.DateTimeFormat("en-NG", { day:"numeric", month:"short", year:"numeric" }).format(new Date(booking.confirmedAt))}</span><ArrowRight size={16} /></footer>
          </Link>)}
        </div>}
      </section>
    </main>
  );
}
