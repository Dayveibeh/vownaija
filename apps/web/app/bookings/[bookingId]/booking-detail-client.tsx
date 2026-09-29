"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarCheck2, CheckCircle2, CreditCard, Download, FileText, HandCoins, LockKeyhole, MapPin, MessageSquare, ShieldCheck, WalletCards } from "lucide-react";
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

function activityDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type PaymentTimelineItem = {
  key: string;
  title: string;
  body: string;
  date: string | null;
  state: "complete" | "pending" | "attention" | "muted";
  icon: "booking" | "payment" | "protected" | "case" | "payout";
};

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
  const [paymentSummary, setPaymentSummary] = useState(initialPaymentSummary);
  const [paymentStarting, setPaymentStarting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [releaseStarting, setReleaseStarting] = useState(false);
  const [releaseError, setReleaseError] = useState("");
  const [releaseNotice, setReleaseNotice] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeStarting, setDisputeStarting] = useState(false);
  const [disputeError, setDisputeError] = useState("");
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

  async function releasePayout() {
    const confirmed = window.confirm(
      paymentSummary.simulationEnabled
        ? "Simulate releasing this test payout? No real transfer will be sent to the vendor."
        : paymentSummary.payoutMode === "test"
          ? "Release this test payout to the vendor's connected Paystack recipient? This is a test-mode transfer."
          : "Release this payout to the vendor? This action starts the provider transfer and cannot be undone from Smitten.",
    );
    if (!confirmed) return;

    setReleaseError("");
    setReleaseNotice("");
    setReleaseStarting(true);

    try {
      const response = await fetch("/api/payments/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "We couldn’t release this payout.");

      if (result.paymentSummary) setPaymentSummary(result.paymentSummary);
      const release = Array.isArray(result.releases) ? result.releases[0] : null;
      setReleaseNotice(
        release?.status === "simulated"
          ? "Test payout release simulated successfully."
          : release?.status === "success"
            ? "Vendor payout released."
            : "Release started. Paystack is processing the transfer.",
      );
    } catch (error) {
      setReleaseError(error instanceof Error ? error.message : "We couldn’t release this payout.");
    } finally {
      setReleaseStarting(false);
    }
  }

  async function openDispute() {
    setDisputeError("");
    setDisputeStarting(true);
    try {
      const response = await fetch("/api/payments/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, reason: disputeReason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "We couldn’t open this dispute.");
      if (result.paymentSummary) setPaymentSummary(result.paymentSummary);
      setShowDisputeForm(false);
      setDisputeReason("");
    } catch (error) {
      setDisputeError(error instanceof Error ? error.message : "We couldn’t open this dispute.");
    } finally {
      setDisputeStarting(false);
    }
  }

  const paymentLabel = paymentSummary.paymentStatus === "paid"
    ? "Paid"
    : paymentSummary.paymentStatus === "partially_paid"
      ? paymentSummary.paymentPlan === "deposit" && paymentSummary.depositDue <= 0 ? "Deposit paid" : "Partially paid"
      : paymentSummary.paymentStatus === "refunded"
        ? "Refunded"
        : "Payment due";

  const successfulPayments = paymentSummary.payments
    .filter((payment) => (payment.status === "paid" || payment.status === "refunded") && payment.paidAt)
    .slice()
    .sort((a, b) => new Date(a.paidAt || 0).getTime() - new Date(b.paidAt || 0).getTime());

  const paymentTimeline: PaymentTimelineItem[] = [
    {
      key: "booking-confirmed",
      title: "Booking confirmed",
      body: `Accepted quote for ${formatNaira(booking.total)}.`,
      date: booking.confirmedAt,
      state: "complete",
      icon: "booking",
    },
    ...successfulPayments.map((payment) => ({
      key: payment.id,
      title: payment.purpose === "deposit"
        ? "Deposit paid"
        : payment.purpose === "balance"
          ? "Balance paid"
          : "Payment received",
      body: `${formatNaira(payment.amount)} verified through Paystack.`,
      date: payment.paidAt,
      state: payment.status === "refunded" ? "muted" as const : "complete" as const,
      icon: "payment",
    })),
  ];

  const latestPaidDate = successfulPayments
    .map((payment) => payment.paidAt)
    .filter(Boolean)
    .at(-1) || null;

  if (paymentSummary.paymentStatus === "paid" && latestPaidDate) {
    paymentTimeline.push({
      key: "fully-paid",
      title: "Booking fully paid",
      body: `The full ${formatNaira(paymentSummary.total)} booking total has been received.`,
      date: latestPaidDate,
      state: "complete",
      icon: "protected",
    });
  }

  if (paymentSummary.caseStatus !== "none") {
    paymentTimeline.push({
      key: "payment-case",
      title: paymentSummary.caseStatus === "dispute_open"
        ? "Payment dispute opened"
        : paymentSummary.caseStatus === "refund_processed"
          ? "Refund completed"
          : paymentSummary.caseStatus === "refund_failed"
            ? "Refund did not complete"
            : paymentSummary.caseStatus === "refund_needs_attention"
              ? "Refund needs attention"
              : "Refund processing",
      body: paymentSummary.caseStatus === "dispute_open"
        ? "Vendor payout is paused while Smitten reviews the issue."
        : paymentSummary.caseStatus === "refund_processed"
          ? "Smitten records the payment as refunded."
          : paymentSummary.caseStatus === "refund_failed"
            ? "The payment returned to a protected state for review."
            : "The refund is being handled through the provider.",
      date: paymentSummary.caseOpenedAt,
      state: paymentSummary.caseStatus === "refund_processed" ? "complete" : "attention",
      icon: "case",
    });
  }

  if (paymentSummary.releaseStatus === "released") {
    paymentTimeline.push({
      key: "payout-released",
      title: paymentSummary.simulationEnabled ? "Test payout release completed" : "Vendor payout released",
      body: paymentSummary.simulationEnabled
        ? "Staging release completed without sending a real bank transfer."
        : "Smitten completed the vendor payout.",
      date: paymentSummary.releaseAt,
      state: "complete",
      icon: "payout",
    });
  } else if (paymentSummary.paymentStatus === "partially_paid" && paymentSummary.outstanding > 0) {
    paymentTimeline.push({
      key: "balance-remaining",
      title: "Balance remaining",
      body: `${formatNaira(paymentSummary.outstanding)} is still due on this booking.`,
      date: null,
      state: "pending",
      icon: "payment",
    });
  } else if (
    paymentSummary.paymentStatus === "paid" &&
    paymentSummary.caseStatus === "none" &&
    paymentSummary.releaseStatus !== "processing" &&
    paymentSummary.releaseStatus !== "queued"
  ) {
    paymentTimeline.push({
      key: "awaiting-release",
      title: "Awaiting customer release",
      body: isCustomer
        ? "Release the vendor payout when the service is complete and you're satisfied."
        : "The payment remains protected until the customer releases the payout.",
      date: null,
      state: "pending",
      icon: "payout",
    });
  }

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

            {paymentSummary.paymentPlan === "deposit" && <div className="booking-payment-schedule">
              <div><small>Deposit</small><strong>{formatNaira(paymentSummary.depositAmount)}</strong><span>{paymentSummary.depositDue > 0 ? `${formatNaira(paymentSummary.depositDue)} still due` : "Paid"}</span></div>
              <div><small>Balance</small><strong>{formatNaira(Math.max(0, paymentSummary.total - paymentSummary.depositAmount))}</strong><span>{paymentSummary.depositDue > 0 ? "Due after deposit" : `${formatNaira(paymentSummary.balanceDue)} remaining`}</span></div>
            </div>}

            {paymentSummary.paymentStatus === "paid" || paymentSummary.paymentStatus === "partially_paid" || paymentSummary.paymentStatus === "refunded" ? <div className={`payment-protection-card ${paymentSummary.caseStatus === "dispute_open" || paymentSummary.caseStatus === "refund_needs_attention" ? "warning" : "success"}`}>
              {paymentSummary.caseStatus === "dispute_open" || paymentSummary.caseStatus === "refund_needs_attention"
                ? <AlertTriangle size={21} />
                : paymentSummary.releaseStatus === "released" || paymentSummary.caseStatus === "refund_processed"
                  ? <CheckCircle2 size={21} />
                  : paymentSummary.releaseStatus === "processing" || paymentSummary.releaseStatus === "queued" || paymentSummary.caseStatus === "refund_processing"
                    ? <HandCoins size={21} />
                    : <ShieldCheck size={21} />}
              <span>
                <strong>
                  {paymentSummary.caseStatus === "dispute_open"
                    ? (isCustomer ? "Payment dispute open" : "Payout paused — dispute open")
                    : paymentSummary.caseStatus === "refund_processing"
                      ? "Refund processing"
                      : paymentSummary.caseStatus === "refund_needs_attention"
                        ? "Refund needs attention"
                        : paymentSummary.caseStatus === "refund_processed"
                          ? "Payment refunded"
                          : paymentSummary.paymentStatus === "partially_paid" && paymentSummary.paymentPlan === "deposit" && paymentSummary.depositDue <= 0
                          ? "Deposit paid"
                          : paymentSummary.releaseStatus === "released"
                            ? (paymentSummary.simulationEnabled ? "Test payout release simulated" : "Vendor payout released")
                            : paymentSummary.releaseStatus === "processing" || paymentSummary.releaseStatus === "queued"
                              ? "Payout release in progress"
                              : !isCustomer && paymentSummary.paymentStatus === "paid"
                                ? "Awaiting customer release"
                                : "Payment received"}
                </strong>
                <small>
                  {paymentSummary.caseStatus === "dispute_open"
                    ? (isCustomer ? "Smitten has paused the vendor payout while this issue is reviewed." : "The customer reported a payment issue. Smitten has paused release until the dispute is resolved.")
                    : paymentSummary.caseStatus === "refund_processing"
                      ? "A refund has been submitted to Paystack. The webhook will update this booking when processing completes."
                      : paymentSummary.caseStatus === "refund_needs_attention"
                        ? "Paystack needs additional information before the refund can complete."
                        : paymentSummary.caseStatus === "refund_processed"
                          ? "The payment has been marked refunded after provider confirmation."
                          : paymentSummary.paymentStatus === "partially_paid" && paymentSummary.paymentPlan === "deposit" && paymentSummary.depositDue <= 0
                          ? `${formatNaira(paymentSummary.balanceDue)} balance remains. The vendor payout stays protected until the booking is fully paid.`
                          : paymentSummary.releaseStatus === "released"
                            ? paymentSummary.simulationEnabled
                              ? "Staging simulation complete. No real bank transfer was sent."
                              : (isCustomer ? "The vendor payout has been completed for this payment." : "Smitten has completed the payout for this payment.")
                            : paymentSummary.releaseStatus === "processing" || paymentSummary.releaseStatus === "queued"
                              ? "Paystack is processing the vendor transfer. Smitten will update this booking when the transfer webhook confirms the final status."
                              : isCustomer
                                ? "Your payment is recorded against this booking. Vendor payout has not been released yet."
                                : "The customer has paid. No action is required from you; the payout remains held until the customer releases it."}
                </small>
              </span>
            </div> : <div className="payment-protection-card">
              <LockKeyhole size={21} />
              <span><strong>Secure Smitten checkout</strong><small>{isCustomer ? "Pay through Paystack. Smitten verifies the transaction server-side before marking this booking as paid." : "The customer will pay through Smitten checkout. The booking updates only after provider verification."}</small></span>
            </div>}

            {isCustomer && paymentSummary.outstanding > 0 && <div className="payment-action-row">
              <button className="booking-pay-button" onClick={() => void startPayment()} disabled={paymentStarting || !paymentSummary.providerConfigured}>
                <CreditCard size={17} /> {paymentStarting
                  ? "Opening secure checkout…"
                  : paymentSummary.nextPaymentPurpose === "deposit"
                    ? `Pay deposit ${formatNaira(paymentSummary.nextPaymentAmount)}`
                    : paymentSummary.nextPaymentPurpose === "balance"
                      ? `Pay balance ${formatNaira(paymentSummary.nextPaymentAmount)}`
                      : `Pay ${formatNaira(paymentSummary.nextPaymentAmount || paymentSummary.outstanding)}`}
              </button>
              {!paymentSummary.providerConfigured && <small>Paystack test keys still need to be added to this preview before checkout can open.</small>}
              {paymentError && <small className="payment-error">{paymentError}</small>}
            </div>}

            {isCustomer && paymentSummary.paymentStatus === "paid" && paymentSummary.caseStatus === "none" && paymentSummary.releaseStatus !== "released" && paymentSummary.releaseStatus !== "processing" && paymentSummary.releaseStatus !== "queued" && <div className="payout-release-action">
              <div>
                <HandCoins size={20} />
                <span>
                  <strong>Release vendor payout</strong>
                  <small>
                    {!paymentSummary.vendorPayoutReady
                      ? "The vendor needs to connect and verify a payout account first."
                      : paymentSummary.simulationEnabled
                        ? "Staging simulation: this tests Smitten's release flow without sending a real Paystack transfer."
                        : paymentSummary.payoutMode === "test"
                          ? "Test mode: this starts a Paystack test transfer to the vendor's verified recipient."
                          : "Release starts the vendor transfer through Paystack."}
                  </small>
                </span>
              </div>
              <button
                type="button"
                onClick={() => void releasePayout()}
                disabled={releaseStarting || !paymentSummary.vendorPayoutReady || !paymentSummary.releaseEnabled}
              >
                <HandCoins size={16} /> {releaseStarting ? "Starting release…" : paymentSummary.simulationEnabled ? "Simulate release" : "Release payout"}
              </button>
              {!paymentSummary.releaseEnabled && paymentSummary.payoutMode === "live" && <small className="payment-error">Live payout releases are disabled until production payout controls are explicitly enabled.</small>}
              {releaseNotice && <small className="payment-success">{releaseNotice}</small>}
              {releaseError && <small className="payment-error">{releaseError}</small>}
            </div>}

            {isCustomer && paymentSummary.paymentStatus === "paid" && paymentSummary.releaseStatus !== "released" && paymentSummary.caseStatus === "none" && <div className="payment-dispute-action">
              {!showDisputeForm ? <>
                <div>
                  <AlertTriangle size={18} />
                  <span><strong>Something wrong with this booking?</strong><small>Report a problem before payout is released. Smitten will immediately pause the vendor payout.</small></span>
                </div>
                <button type="button" onClick={() => setShowDisputeForm(true)}>Report a problem</button>
              </> : <>
                <div className="payment-dispute-form">
                  <label>Tell Smitten what happened
                    <textarea
                      value={disputeReason}
                      onChange={(event) => setDisputeReason(event.target.value.slice(0,1200))}
                      placeholder="Describe the issue with the service, booking or payment…"
                      rows={4}
                    />
                  </label>
                  <div>
                    <button type="button" className="secondary" onClick={() => { setShowDisputeForm(false); setDisputeError(""); }}>Cancel</button>
                    <button type="button" onClick={() => void openDispute()} disabled={disputeStarting || disputeReason.trim().length < 10}>
                      {disputeStarting ? "Opening dispute…" : "Pause payout & report"}
                    </button>
                  </div>
                  {disputeError && <small className="payment-error">{disputeError}</small>}
                </div>
              </>}
            </div>}

            {paymentSummary.caseStatus === "dispute_open" && paymentSummary.caseReason && <div className="payment-case-reason">
              <small>Dispute details</small>
              <p>{paymentSummary.caseReason}</p>
            </div>}

            <section className="booking-payment-timeline">
              <div className="booking-payment-subheading">
                <div><small>Booking journey</small><h4>Payment timeline</h4></div>
                <span>{paymentTimeline.filter((item) => item.state === "complete").length} completed</span>
              </div>
              <div className="payment-timeline-list">
                {paymentTimeline.map((item, index) => <article className={`payment-timeline-item ${item.state}`} key={item.key}>
                  <div className="payment-timeline-rail">
                    <span>
                      {item.icon === "booking"
                        ? <CalendarCheck2 size={15} />
                        : item.icon === "payout"
                          ? <HandCoins size={15} />
                          : item.icon === "case"
                            ? <AlertTriangle size={15} />
                            : item.icon === "protected"
                              ? <ShieldCheck size={15} />
                              : <CreditCard size={15} />}
                    </span>
                    {index < paymentTimeline.length - 1 && <i />}
                  </div>
                  <div className="payment-timeline-copy">
                    <div><strong>{item.title}</strong>{item.date && <time>{activityDate(item.date)}</time>}</div>
                    <p>{item.body}</p>
                  </div>
                </article>)}
              </div>
            </section>

            {successfulPayments.length > 0 && <section className="payment-receipts">
              <div className="booking-payment-subheading">
                <div><small>Documents</small><h4>Payment receipts</h4></div>
                <span>{successfulPayments.length} {successfulPayments.length === 1 ? "receipt" : "receipts"}</span>
              </div>

              <div className="payment-receipt-list">
                {successfulPayments.map((payment) => <article className="payment-receipt-row" key={payment.id}>
                  <div className="payment-receipt-main">
                    <span className="payment-receipt-icon"><FileText size={16} /></span>
                    <span>
                      <strong>{payment.purpose === "deposit" ? "Deposit receipt" : payment.purpose === "balance" ? "Balance receipt" : "Payment receipt"}</strong>
                      <small>{activityDate(payment.paidAt)} · {formatNaira(payment.amount)}</small>
                    </span>
                  </div>
                  <a href={`/api/payments/${payment.id}/receipt`} download>
                    <Download size={15} /> Download PDF
                  </a>
                  <details className="payment-transaction-details">
                    <summary>View transaction details</summary>
                    <div>
                      <span><small>Status</small><strong>{payment.status}</strong></span>
                      <span><small>Smitten payment ID</small><code>{payment.id}</code></span>
                      <span><small>Paystack reference</small><code>{payment.providerReference}</code></span>
                      <span><small>Funds status</small><strong>{payment.fundsStatus.replace("_", " ")}</strong></span>
                    </div>
                  </details>
                </article>)}
              </div>

              {paymentSummary.payments.some((payment) => !["paid","refunded"].includes(payment.status)) && <details className="payment-other-attempts">
                <summary>Show incomplete payment attempts</summary>
                <div>
                  {paymentSummary.payments.filter((payment) => !["paid","refunded"].includes(payment.status)).map((payment) => <span key={payment.id}>
                    <strong>{payment.purpose === "deposit" ? "Deposit" : payment.purpose === "balance" ? "Balance" : "Payment"}</strong>
                    <small>{formatNaira(payment.amount)} · {payment.status}</small>
                    <code>{payment.providerReference}</code>
                  </span>)}
                </div>
              </details>}
            </section>}
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
