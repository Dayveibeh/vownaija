"use client";

import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, Landmark, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { PaystackBank, VendorPayoutProfileView } from "@/lib/payments";
import { Brand } from "../../components/Brand";
import { SessionAccountNav } from "../../components/SessionAccountNav";

export default function PayoutSettingsClient({
  initialProfile,
}: {
  initialProfile: VendorPayoutProfileView;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [banks, setBanks] = useState<PaystackBank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/payments/paystack/banks", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result?.message || "Unable to load banks.");
        if (!cancelled) setBanks(Array.isArray(result?.banks) ? result.banks : []);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load banks.");
      })
      .finally(() => {
        if (!cancelled) setLoadingBanks(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function savePayoutAccount(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setRemoved(false);

    const bank = banks.find((item) => item.code === bankCode);
    if (!bank) {
      setError("Choose your bank.");
      return;
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      setError("Enter a valid 10-digit Nigerian account number.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/payments/payout-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCode, bankName: bank.name, accountNumber }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Unable to save payout account.");
      setProfile(result.payoutProfile);
      setBankCode("");
      setAccountNumber("");
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save payout account.");
    } finally {
      setSaving(false);
    }
  }

  async function removePayoutAccount() {
    const confirmed = window.confirm(
      "Remove this payout account? Smitten will no longer be able to release vendor payouts to it.",
    );
    if (!confirmed) return;

    setError("");
    setSaved(false);
    setRemoved(false);
    setRemoving(true);

    try {
      const response = await fetch("/api/payments/payout-profile", { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Unable to remove payout account.");
      setProfile(result.payoutProfile);
      setBankCode("");
      setAccountNumber("");
      setRemoved(true);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove payout account.");
    } finally {
      setRemoving(false);
    }
  }

  const connected = profile.status === "verified";

  return (
    <main className="phase3-payout-page">
      <header className="quote-detail-topbar">
        <Brand />
        <Link href="/dashboard"><ArrowLeft size={16} /> Vendor dashboard</Link>
        <SessionAccountNav variant="compact" />
      </header>

      <section className="phase3-payout-shell">
        <aside className="phase3-payout-intro">
          <p className="eyebrow"><span /> Vendor payouts</p>
          <h1>Where Smitten sends your money.</h1>
          <p>Connect a Nigerian bank account for future booking payouts. Your full account number is used for provider verification but is not stored in Smitten.</p>

          <div className="phase3-payout-safety">
            <ShieldCheck />
            <span><strong>Provider-verified payout account</strong><small>Paystack resolves the account name before a payout recipient is created.</small></span>
          </div>
          <div className="phase3-payout-safety">
            <LockKeyhole />
            <span><strong>Release is separate from payment</strong><small>A customer paying does not automatically trigger a vendor transfer. Release rules remain a separate Smitten step.</small></span>
          </div>
        </aside>

        <div className="phase3-payout-stack">
          <section className="phase3-payout-card phase3-payout-current-card">
            <header>
              <div><Landmark /><span><small>Current payout account</small><strong>{connected ? "Account connected" : "No account connected"}</strong></span></div>
              <b className={profile.status}>{connected ? "Verified" : "Not connected"}</b>
            </header>

            {connected ? <>
              <div className="phase3-current-payout">
                <span><Building2 /></span>
                <div><small>{profile.bankName}</small><strong>{profile.accountName}</strong><p>•••• •••• {profile.accountLast4}</p></div>
                <CheckCircle2 />
              </div>
              <div className="phase3-payout-remove-row">
                <div>
                  <strong>Remove payout account</strong>
                  <small>This deactivates the Paystack transfer recipient and disconnects it from Smitten.</small>
                </div>
                <button type="button" onClick={removePayoutAccount} disabled={removing}>
                  <Trash2 size={15} /> {removing ? "Removing…" : "Remove"}
                </button>
              </div>
            </> : <div className="phase3-payout-empty">
              <Landmark />
              <div><strong>No payout destination yet</strong><p>Add a verified bank account below before Smitten can release vendor payouts.</p></div>
            </div>}
          </section>

          <section className="phase3-payout-card phase3-payout-add-card">
            <header>
              <div><Building2 /><span><small>{connected ? "Change payout destination" : "Payout destination"}</small><strong>{connected ? "Add a different account" : "Connect your bank account"}</strong></span></div>
            </header>

            {!profile.providerConfigured ? <div className="phase3-provider-pending">
              <LockKeyhole />
              <div><strong>Paystack test mode still needs connecting</strong><p>The payout form will become active once the Paystack test secret key is added to this deployment.</p></div>
            </div> : <form onSubmit={savePayoutAccount} className="phase3-payout-form">
              <p className="phase3-payout-form-intro">
                {connected
                  ? "Verify another bank account to replace your current payout destination."
                  : "Enter the bank account you want Smitten to use for future vendor payouts."}
              </p>
              <label>Bank
                <select value={bankCode} onChange={(event) => setBankCode(event.target.value)} required disabled={loadingBanks}>
                  <option value="">{loadingBanks ? "Loading Nigerian banks…" : "Choose bank"}</option>
                  {banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
                </select>
              </label>
              <label>Account number
                <input
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="10-digit account number"
                  required
                />
              </label>
              <div className="phase3-payout-form-note"><ShieldCheck size={15} /><span>Paystack verifies the account name and creates the payout recipient. Smitten keeps only the resolved name, bank, last four digits and recipient code.</span></div>
              {error && <p className="phase3-form-error">{error}</p>}
              {saved && <p className="phase3-form-success"><CheckCircle2 size={15} /> Payout account verified and {connected ? "updated" : "saved"}.</p>}
              {removed && <p className="phase3-form-success"><CheckCircle2 size={15} /> Previous payout account removed.</p>}
              <button type="submit" disabled={saving || loadingBanks}>{saving ? "Verifying account…" : connected ? "Verify & replace payout account" : "Verify & connect account"}</button>
            </form>}
          </section>
        </div>
      </section>
    </main>
  );
}
