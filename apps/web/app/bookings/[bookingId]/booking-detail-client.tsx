"use client";

import Link from "next/link";
import { ArrowLeft, CalendarCheck2, CheckCircle2, CreditCard, Download, FileText, LockKeyhole, MapPin, MessageSquare, ShieldCheck, WalletCards } from "lucide-react";
import { formatNaira } from "@smitten/shared";
import type { BookingView, QuoteView } from "@/lib/quotes";
import type { BookingPaymentSummary } from "@/lib/payments";
import { useState } from "react";
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
  paymentSummary: initialPaymentSummary,
}: {
  booking: BookingView;
  quote: QuoteView;
  role: "couple" | "vendor" | "admin";
  paymentSummary: BookingPaymentSummary;
}) {
  const [paymentSummary] = useState(initialPaymentSummary);
  const [paymentStarting, setPaymentStarting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const isCustomer = role === "couple";
  const backHref = isCustomer ? "/couples/bookings" : "/dashboard/bookings";
  const counterparty = isCustomer ? booking.vendorName : booking.customerName;

  async function startPayment() {
    setPaymentError("");
    setPaymentStarting(true);
    try {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "We couldn’t start payment.");
      window.location.href = String(result.authorizationUrl);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "We couldn’t start payment.");
      setPaymentStarting(false);
    }
  }

  const paymentLabel = paymentSummary.paymentStatus === "paid"
    ? "Paid"
    : paymentSummary.paymentStatus === "partially_paid"
      ? "Partially paid"
      : paymentSummary.paymentStatus === "refunded"
        ? "Refunded"
        : "Payment due";

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

          <section className={`booking-payment-mini ${paymentSummary.paymentStatus}`}>
            <div><WalletCards size={17} /><span><small>Payment</small><strong>{paymentLabel}</strong></span></div>
            <b>{paymentSummary.outstanding > 0 ? formatNaira(paymentSummary.outstanding) + " due" : formatNaira(paymentSummary.paid) + " received"}</b>
          </section>

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

          <section className="booking-payment-section">
            <div className="booking-section-heading">
              <div><p className="eyebrow"><span /> Payment</p><h3>{paymentLabel}</h3></div>
              <span className={`payment-state-pill ${paymentSummary.paymentStatus}`}>{paymentSummary.paymentStatus.replace("_", " ")}</span>
            </div>

            <div className="payment-overview-grid">
              <article><small>Booking total</small><strong>{formatNaira(paymentSummary.total)}</strong></article>
              <article><small>Paid</small><strong>{formatNaira(paymentSummary.paid)}</strong></article>
              <article><small>Outstanding</small><strong>{formatNaira(paymentSummary.outstanding)}</strong></article>
            </div>

            {paymentSummary.paymentStatus === "paid" ? <div className="payment-protection-card success">
              <ShieldCheck size={21} />
              <span><strong>Payment received</strong><small>{isCustomer ? "Your payment is recorded against this booking. Vendor payout has not been released yet." : "The customer has paid. Smitten has recorded the funds for this booking and payout release is still pending."}</small></span>
            </div> : <div className="payment-protection-card">
              <LockKeyhole size={21} />
              <span><strong>Secure Smitten checkout</strong><small>{isCustomer ? "Pay through Paystack. Smitten verifies the transaction server-side before marking this booking as paid." : "The customer will pay through Smitten checkout. The booking updates only after provider verification."}</small></span>
            </div>}

            {isCustomer && paymentSummary.outstanding > 0 && <div className="payment-action-row">
              <button className="booking-pay-button" onClick={() => void startPayment()} disabled={paymentStarting || !paymentSummary.providerConfigured}>
                <CreditCard size={17} /> {paymentStarting ? "Opening secure checkout…" : `Pay ${formatNaira(paymentSummary.outstanding)}`}
              </button>
              {!paymentSummary.providerConfigured && <small>Paystack test keys still need to be added to this preview before checkout can open.</small>}
              {paymentError && <small className="payment-error">{paymentError}</small>}
            </div>}

            {paymentSummary.payments.length > 0 && <div className="payment-history">
              <h4>Payment activity</h4>
              {paymentSummary.payments.map((payment) => <div key={payment.id}>
                <span>{payment.status === "paid" ? <CheckCircle2 size={15} /> : <CreditCard size={15} />}<span><strong>{formatNaira(payment.amount)}</strong><small>{payment.providerReference}</small></span></span>
                <b className={payment.status}>{payment.status}</b>
              </div>)}
            </div>}
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
