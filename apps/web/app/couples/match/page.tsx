"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Heart, MapPin, Sparkles, Star, UsersRound, WalletCards, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { recommendCoupleVendors, serviceOptions, styleOptions, weddingLocations } from "../vendor-data";
import { Brand } from "../../components/Brand";

function budgetCeiling(budget: string) {
  if (budget === "Under ₦1m") return 999999;
  if (budget === "₦1m–₦3m") return 3000000;
  if (budget === "₦3m–₦7m") return 7000000;
  return 50000000;
}

export default function CoupleMatchPage() {
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState("Lagos");
  const [weddingType, setWeddingType] = useState("Traditional & white wedding");
  const [weddingDate, setWeddingDate] = useState("2026-12");
  const [guestCount, setGuestCount] = useState("201–350 guests");
  const [budget, setBudget] = useState("₦1m–₦3m");
  const [services, setServices] = useState(["Planning & décor", "Photography", "Cakes & desserts"]);
  const [style, setStyle] = useState("Modern");
  const [saved, setSaved] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const matches = useMemo(() => {
    return recommendCoupleVendors({ location, budgetCeiling: budgetCeiling(budget), services, style }).slice(0, 4);
  }, [budget, location, services, style]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch("/api/customer/preferences", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
      fetch("/api/favourites", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
    ]).then(([preferenceResult, favouriteResult]) => {
      if (cancelled) return;
      const profile = preferenceResult?.profile;
      if (profile) {
        if (profile.weddingLocation) setLocation(profile.weddingLocation);
        if (profile.weddingType) setWeddingType(profile.weddingType);
        if (profile.weddingDate) setWeddingDate(String(profile.weddingDate).slice(0, 7));
        if (profile.guestCount) setGuestCount(profile.guestCount);
        if (profile.budgetBand) setBudget(profile.budgetBand);
        if (profile.weddingStyle) setStyle(profile.weddingStyle);
        if (Array.isArray(profile.requiredServices) && profile.requiredServices.length) setServices(profile.requiredServices);
      }
      if (Array.isArray(favouriteResult?.favourites)) {
        setSaved(favouriteResult.favourites.map((item: { vendorId: string }) => item.vendorId));
      }
    }).catch(() => {
      // Signed-out users and temporarily unavailable services keep the local defaults.
    });

    return () => { cancelled = true; };
  }, []);

  function toggleService(service: string) {
    setServices((current) => current.includes(service) ? current.filter((item) => item !== service) : [...current, service]);
  }

  async function toggleSaved(vendorId: string) {
    const wasSaved = saved.includes(vendorId);
    setSaved((current) => wasSaved ? current.filter((item) => item !== vendorId) : [...current, vendorId]);

    try {
      const response = await fetch("/api/favourites", {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });

      // Signed-out users can still use favourites for the current session.
      if (response.status === 401) return;
      if (!response.ok) throw new Error("Favourite update failed");
    } catch {
      setSaved((current) => wasSaved ? [...current, vendorId] : current.filter((item) => item !== vendorId));
      setSaveError("We couldn’t update your saved vendors. Please try again.");
    }
  }

  async function buildShortlist() {
    setSaveError("");
    setSaving(true);
    try {
      const response = await fetch("/api/customer/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingDate,
          weddingLocation: location,
          weddingType,
          guestCount,
          budgetBand: budget,
          weddingStyle: style,
          requiredServices: services,
        }),
      });

      // Matching remains available before sign-in; persistence begins after authentication.
      if (response.status === 401) {
        setStep(4);
        return;
      }
      if (!response.ok) throw new Error("Preference save failed");
      setStep(4);
    } catch {
      setSaveError("We couldn’t save your wedding preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="match-shell">
      <header className="match-header">
        <Brand />
        {step > 0 && step < 4 && <div className="match-progress"><span>Step {step} of 3</span><i><b style={{ width: `${(step / 3) * 100}%` }} /></i></div>}
      </header>

      {step === 0 && <section className="match-welcome">
        <div className="match-spark"><WandSparkles size={38} /><i /><i /><i /></div>
        <p className="eyebrow"><span /> Meet your AI matchmaker</p>
        <h1>Let’s find vendors who<br /><em>fit your kind of wedding.</em></h1>
        <p>Tell Smitten AI a little about your plans. We’ll balance budget, location, style, reviews and availability to build a personalised shortlist.</p>
        <div className="match-feature-row"><span><MapPin /> Your location</span><span><WalletCards /> Your budget</span><span><Sparkles /> Your style</span></div>
        <button className="button button-primary" onClick={() => setStep(1)}>Find my matches <ArrowRight size={18} /></button>
        <Link href="/couples/dashboard">No thanks, take me to my dashboard</Link>
      </section>}

      {step > 0 && step < 4 && <section className="match-question-card">
        {step === 1 && <div className="match-step">
          <div className="question-icon"><CalendarDays /></div><p className="step-label">The basics</p><h2>Tell us about your celebration</h2><p>This helps us prioritise vendors who work in your area and at your scale.</p>
          <div className="match-fields"><label>Wedding location<div className="field-with-icon"><MapPin /><select value={location} onChange={(event) => setLocation(event.target.value)}>{weddingLocations.map((item) => <option key={item}>{item}</option>)}</select></div></label><label>Wedding type<select value={weddingType} onChange={(event) => setWeddingType(event.target.value)}><option>Traditional wedding</option><option>White wedding</option><option>Traditional & white wedding</option><option>Civil ceremony</option><option>Destination wedding</option></select></label><label>Approximate date<input type="month" value={weddingDate} onChange={(event) => setWeddingDate(event.target.value)} /></label><label>Guest count<div className="field-with-icon"><UsersRound /><select value={guestCount} onChange={(event) => setGuestCount(event.target.value)}><option>Under 100 guests</option><option>100–200 guests</option><option>201–350 guests</option><option>351–500 guests</option><option>500+ guests</option></select></div></label></div>
        </div>}

        {step === 2 && <div className="match-step">
          <div className="question-icon"><WalletCards /></div><p className="step-label">Budget & services</p><h2>What are you comfortable spending?</h2><p>Choose the amount you’ve roughly set aside for vendors. We’ll show good options at that level, not pressure you to spend more.</p>
          <label className="match-field-title">Total vendor budget</label><div className="budget-options">{["Under ₦1m", "₦1m–₦3m", "₦3m–₦7m", "₦7m+"].map((item) => <button key={item} className={budget === item ? "selected" : ""} onClick={() => setBudget(item)}>{budget === item && <Check size={16} />}<strong>{item}</strong><small>{item === "Under ₦1m" ? "Keep it lean" : item === "₦1m–₦3m" ? "Value-focused" : item === "₦3m–₦7m" ? "More flexibility" : "Premium & luxury"}</small></button>)}</div>
          <label className="match-field-title">Which vendors do you need?</label><div className="service-pills">{serviceOptions.map((service) => <button key={service} className={services.includes(service) ? "selected" : ""} onClick={() => toggleService(service)}>{services.includes(service) && <Check size={14} />}{service}</button>)}</div>
        </div>}

        {step === 3 && <div className="match-step">
          <div className="question-icon"><Sparkles /></div><p className="step-label">The feeling</p><h2>What should your wedding feel like?</h2><p>Pick the style closest to your vision. You can always mix and change this later.</p>
          <div className="style-options">{styleOptions.map((item) => <button key={item} className={style === item ? "selected" : ""} onClick={() => setStyle(item)}><span className={`style-swatch ${item.toLowerCase()}`} /><strong>{item}</strong>{style === item && <Check />}</button>)}</div>
          <div className="priority-box"><Sparkles /><div><strong>Smitten AI will prioritise:</strong><p>Strong reviews · {location} availability · {budget} budget · {style.toLowerCase()} style · {guestCount.toLowerCase()}</p></div></div>
        </div>}

        {saveError && <p role="alert" className="form-error">{saveError}</p>}
        <div className="match-step-actions"><button onClick={() => setStep((current) => current - 1)} disabled={saving}><ArrowLeft size={16} /> Back</button><button className="button button-primary" disabled={saving} onClick={() => step === 3 ? void buildShortlist() : setStep((current) => current + 1)}>{saving ? "Saving…" : step === 3 ? "Build my shortlist" : "Continue"} {step === 3 ? <Sparkles size={17} /> : <ArrowRight size={17} />}</button></div>
      </section>}

      {step === 4 && <section className="match-results">
        <div className="results-heading"><div><p className="eyebrow"><span /> Your Smitten shortlist</p><h1>We found your<br /><em>strongest matches.</em></h1><p>Based on a {weddingType.toLowerCase()} in {location}, a {budget} vendor budget and your {style.toLowerCase()} style.</p></div><div className="result-summary"><span><strong>{matches.length}</strong>top matches</span><span><strong>{services.length}</strong>services</span><span><strong>{location}</strong>location</span></div></div>
        {saveError && <p role="alert" className="form-error">{saveError}</p>}
        <div className="match-result-grid">{matches.map((vendor) => <article key={vendor.id}>
          <div className="result-image"><img src={vendor.image} alt={`${vendor.name} wedding portfolio`} /><span>{vendor.score}% match</span><button className={saved.includes(vendor.id) ? "saved" : ""} onClick={() => void toggleSaved(vendor.id)} aria-label={`${saved.includes(vendor.id) ? "Remove" : "Save"} ${vendor.name}`}><Heart size={17} fill={saved.includes(vendor.id) ? "currentColor" : "none"} /></button></div>
          <div className="result-card-body"><div className="result-tier"><span>{vendor.category}</span><i>{vendor.tier}</i></div><h2>{vendor.name}</h2><p className="result-location"><MapPin size={14} /> {vendor.location} <span><Star size={13} fill="currentColor" /> {vendor.rating} ({vendor.reviews})</span></p><div className="match-reason"><Sparkles size={15} /><p><strong>Why Smitten picked this</strong>{vendor.reason}</p></div><div className="result-footer"><strong>{vendor.price}</strong><Link href={`/vendor/${vendor.id}`}>View profile <ChevronRight size={16} /></Link></div></div>
        </article>)}</div>
        <div className="results-bottom"><Link href="/couples/dashboard" className="button button-dark">Save shortlist & continue <ArrowRight size={17} /></Link><button onClick={() => setStep(1)}>Change my answers</button></div>
      </section>}
    </main>
  );
}
