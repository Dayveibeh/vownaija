"use client";

import { AlertTriangle, CheckCircle2, CreditCard, RefreshCcw, RotateCcw, ShieldAlert } from "lucide-react";
import { formatNaira } from "@smitten/shared";
import type { AdminFinancePaymentView } from "@/lib/payments";
import { useState } from "react";

export default function AdminFinanceClient({ initialPayments }: { initialPayments: AdminFinancePaymentView[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function runAction(paymentOrderId: string, action: "resolve_dispute" | "refund" | "reconcile") {
    const promptText = action === "refund"
      ? window.prompt("Reason for this full refund:", "Refund approved by Smitten support")
      : action === "resolve_dispute"
        ? "Resolve this dispute and return the payment to the held state?"
        : null;
    if (action === "refund" && promptText === null) return;
    if (action === "resolve_dispute" && !window.confirm(String(promptText))) return;

    setBusyId(paymentOrderId);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/payments/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentOrderId,
          action,
          reason: action === "refund" ? String(promptText || "") : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Finance action failed.");
      setNotice(
        action === "refund"
          ? "Refund request submitted."
          : action === "resolve_dispute"
            ? "Dispute resolved."
            : result?.reconciliation?.note || "Payment reconciled with Paystack.",
      );
      window.setTimeout(() => window.location.reload(), 650);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Finance action failed.");
    } finally {
      setBusyId(null);
    }
  }

  const openCount = initialPayments.filter((payment) =>
    (payment.caseStatus && ["open","processing","needs_attention"].includes(payment.caseStatus))
    || payment.reconciliationResult === "needs_attention"
    || ["pending","failed","cancelled"].includes(payment.status)
  ).length;

  return (
    <main className="phase3-admin-finance">


      <section className="phase2-list-wrap">
        <div className="phase2-list-heading">
          <div>
            <p className="eyebrow"><span /> Admin finance</p>
            <h1>Payment control</h1>
            <p>Review held funds, customer disputes and provider refunds before money leaves Smitten.</p>
          </div>
          <div className="phase3-payment-total">
            <ShieldAlert />
            <span><small>Needs attention</small><strong>{openCount}</strong></span>
          </div>
        </div>

        {(notice || error) && <div className={error ? "admin-finance-banner error" : "admin-finance-banner"}>
          {error ? <AlertTriangle /> : <CheckCircle2 />}
          <span>{error || notice}</span>
        </div>}

        <div className="admin-finance-list">
          {initialPayments.map((payment) => {
            const disputeOpen = payment.caseType === "dispute" && payment.caseStatus === "open";
            const refundActive = payment.caseType === "refund" && ["open","processing","needs_attention"].includes(payment.caseStatus || "");
            const refundable = payment.status === "paid" && !["released","refunded"].includes(payment.fundsStatus);

            return <article className="admin-finance-card" key={payment.id}>
              <div className="admin-finance-icon"><CreditCard /></div>
              <div className="admin-finance-copy">
                <div><strong>{payment.serviceSummary}</strong><b className={payment.fundsStatus}>{payment.fundsStatus.replace("_"," ")}</b></div>
                <p>{payment.customerName} → {payment.vendorName}</p>
                <small>{payment.providerReference}</small>
                {payment.caseType && <div className={"admin-case-chip " + (payment.caseStatus || "")}>
                  <ShieldAlert size={13} />
                  <span><strong>{payment.caseType === "dispute" ? "Customer dispute" : "Refund"}</strong><small>{payment.caseStatus?.replace("_"," ")}</small></span>
                </div>}
                {payment.reconciliationResult && <div className={"admin-reconciliation-chip " + payment.reconciliationResult}>
                  <RefreshCcw size={13} />
                  <span>
                    <strong>{payment.reconciliationResult === "matched" ? "Provider matched" : payment.reconciliationResult === "repaired" ? "Repaired from Paystack" : "Needs finance review"}</strong>
                    <small>Paystack: {payment.providerStatus || "unknown"}</small>
                  </span>
                </div>}
                {payment.caseReason && <blockquote>{payment.caseReason}</blockquote>}
                {payment.reconciliationNote && <p className="admin-reconciliation-note">{payment.reconciliationNote}</p>}
              </div>
              <div className="admin-finance-amount">
                <strong>{formatNaira(payment.amount)}</strong>
                <small>{payment.status}</small>
              </div>
              <div className="admin-finance-actions">
                <button className="reconcile" disabled={busyId === payment.id} onClick={() => void runAction(payment.id,"reconcile")}>
                  <RefreshCcw size={15} /> {busyId === payment.id ? "Checking…" : "Reconcile"}
                </button>
                {disputeOpen && <button disabled={busyId === payment.id} onClick={() => void runAction(payment.id,"resolve_dispute")}>
                  <CheckCircle2 size={15} /> Resolve dispute
                </button>}
                <button className="refund" disabled={busyId === payment.id || !refundable || refundActive} onClick={() => void runAction(payment.id,"refund")}>
                  <RotateCcw size={15} /> {refundActive ? "Refund processing" : "Full refund"}
                </button>
              </div>
            </article>;
          })}
        </div>

        <p className="admin-finance-footnote"><RefreshCcw size={13} /> Reconcile checks the Paystack transaction directly and only repairs safe payment-state differences. Ambiguous money states are flagged for manual review.</p>
      </section>
    </main>
  );
}
