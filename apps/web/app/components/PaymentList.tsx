import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, CreditCard, MapPin, ShieldCheck } from "lucide-react";
import { formatNaira } from "@smitten/shared";
import type { AccountPaymentView } from "@/lib/payments";
import { Brand } from "./Brand";
import { SessionAccountNav } from "./SessionAccountNav";

function dateLabel(value: string | null) {
  if (!value) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value + "T12:00:00"));
}

export function PaymentList({
  payments,
  role,
}: {
  payments: AccountPaymentView[];
  role: "couple" | "vendor" | "admin";
}) {
  const isVendor = role !== "couple";
  const backHref = isVendor ? "/dashboard" : "/couples/dashboard";
  const paidTotal = payments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);

  return (
    <main className="phase3-payments-page">
      <header className="phase2-list-topbar">
        <Brand />
        <Link href={backHref}><ArrowLeft size={16} /> Dashboard</Link>
        <SessionAccountNav variant="compact" />
      </header>

      <section className="phase2-list-wrap">
        <div className="phase2-list-heading">
          <div>
            <p className="eyebrow"><span /> {isVendor ? "Vendor workspace" : "My wedding"}</p>
            <h1>Payments</h1>
            <p>{isVendor ? "Track customer payments and whether each payout is still pending release." : "See every Smitten payment linked to your confirmed bookings."}</p>
          </div>
          <div className="phase3-payment-total">
            <CreditCard />
            <span><small>Paid through Smitten</small><strong>{formatNaira(paidTotal)}</strong></span>
          </div>
        </div>

        {payments.length === 0 ? <section className="phase2-empty">
          <span><CreditCard /></span>
          <h2>No payments yet</h2>
          <p>{isVendor ? "Payments will appear here after a customer pays for a confirmed booking." : "Once you pay for a confirmed booking, the transaction will appear here."}</p>
          <Link className="button button-primary" href={isVendor ? "/dashboard/bookings" : "/couples/bookings"}>Open bookings <ArrowRight size={16} /></Link>
        </section> : <div className="phase3-payment-list">
          {payments.map((payment) => <Link href={`/bookings/${payment.bookingId}`} className="phase3-payment-card" key={payment.id}>
            <div className="phase3-payment-icon">{payment.status === "paid" ? <CheckCircle2 /> : <CreditCard />}</div>
            <div className="phase3-payment-copy">
              <div><strong>{payment.serviceSummary}</strong><b className={payment.status}>{payment.status}</b></div>
              <p>{isVendor ? payment.customerName : payment.vendorName}</p>
              <span><MapPin size={13} /> {payment.weddingLocation}</span>
              <span><CalendarDays size={13} /> {dateLabel(payment.weddingDate)}</span>
            </div>
            <div className="phase3-payment-amount">
              <strong>{formatNaira(payment.amount)}</strong>
              <small>{payment.fundsStatus === "held" ? <><ShieldCheck size={12} /> Payout pending release</> : <><Clock3 size={12} /> {payment.fundsStatus.replace("_", " ")}</>}</small>
            </div>
            <ArrowRight size={17} />
          </Link>)}
        </div>}
      </section>
    </main>
  );
}
