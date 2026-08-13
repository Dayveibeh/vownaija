"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Heart, MapPin, Sparkles, Star, UsersRound, WalletCards, WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { recommendCoupleVendors, serviceOptions, styleOptions, weddingLocations } from "../vendor-data";

export default function CoupleMatchPage() {
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState("Lagos");
  const [weddingType, setWeddingType] = useState("Traditional & white wedding");
  const [guestCount, setGuestCount] = useState("201–350 guests");
  const [budget, setBudget] = useState("₦1m–₦3m");
  const [services, setServices] = useState(["Planning & décor", "Photography", "Cakes & desserts"]);
  const [style, setStyle] = useState("Modern");

  const matches = useMemo(() => {
    const ceiling = budget === "Under ₦1m" ? 500000 : budget === "₦1m–₦3m" ? 1000000 : budget === "₦3m–₦7m" ? 2200000 : Number.POSITIVE_INFINITY;
    return recommendCoupleVendors({ location, budgetCeiling: ceiling, services, style }).slice(0, 4);
  }, [budget, location, services, style]);

  function toggleService(service: string) {
    setServices((current) => current.includes(service) ? current.filter((item) => item !== service) : [...current, service]);
  }

  return (
    <main className="match-shell">
      <header className="match-header">
        <Link href="/" className="brand"><span className="brand-mark"><Heart size={16} /></span><span>VowNaija</span></Link>
        {step > 0 && step < 4 && <div className="match-progress"><span>Step {step} of 3</span><i><b style={{ width: `${(step / 3) * 100}%` }} /></i></div>}
        <Link href="/couples/dashboard" className="skip-match">Skip for now <ArrowRight size={15} /></Link>
      </header>

      {step === 0 && <section className="match-welcome">
        <div className="match-spark"><WandSparkles size={38} /><i /><i /><i /></div>
        <p className="eyebrow"><span /> Meet your AI matchmaker</p>
        <h1>Let’s find vendors who<br /><em>fit your kind of wedding.</em></h1>
        <p>Tell Vowi a little about your plans. We’ll balance budget, location, style, reviews and availability to build a personalised shortlist.</p>
        <div className="match-feature-row"><span><MapPin /> Your location</span><span><WalletCards /> Your budget</span><span><Sparkles /> Your style</span></div>
        <button className="button button-primary" onClick={() => setStep(1)}>Find my matches <ArrowRight size={18} /></button>
        <Link href="/couples/dashboard">No thanks, take me to my dashboard</Link>
      </section>}

      {step > 0 && step < 4 && <section className="match-question-card">
        {step === 1 && <div className="match-step">
          <div className="question-icon"><CalendarDays /></div><p className="step-label">The basics</p><h2>Tell us about your celebration</h2><p>This helps us prioritise vendors who work in your area and at your scale.</p>
          <div className="match-fields"><label>Wedding location<div className="field-with-icon"><MapPin /><select value={location} onChange={(event) => setLocation(event.target.value)}>{weddingLocations.map((item) => <option key={item}>{item}</option>)}</select></div></label><label>Wedding type<select value={weddingType} onChange={(event) => setWeddingType(event.target.value)}><option>Traditional wedding</option><option>White wedding</option><option>Traditional & white wedding</option><option>Civil ceremony</option><option>Destination wedding</option></select></label><label>Approximate date<input type="month" defaultValue="2026-12" /></label><label>Guest count<div className="field-with-icon"><UsersRound /><select value={guestCount} onChange={(event) => setGuestCount(event.target.value)}><option>Under 100 guests</option><option>100–200 guests</option><option>201–350 guests</option><option>351–500 guests</option><option>500+ guests</option></select></div></label></div>
        </div>}

        {step === 2 && <div className="match-step">
          <div className="question-icon"><WalletCards /></div><p className="step-label">Budget & services</p><h2>What are you comfortable spending?</h2><p>Choose the amount you’ve roughly set aside for vendors. We’ll show good options at that level, not pressure you to spend more.</p>
          <label className="match-field-title">Total vendor budget</label><div className="budget-options">{["Under ₦1m", "₦1m–₦3m", "₦3m–₦7m", "₦7m+"].map((item) => <button key={item} className={budget === item ? "selected" : ""} onClick={() => setBudget(item)}>{budget === item && <Check size={16} />}<strong>{item}</strong><small>{item === "Under ₦1m" ? "Keep it lean" : item === "₦1m–₦3m" ? "Value-focused" : item === "₦3m–₦7m" ? "More flexibility" : "Premium & luxury"}</small></button>)}</div>
          <label className="match-field-title">Which vendors do you need?</label><div className="service-pills">{serviceOptions.map((service) => <button key={service} className={services.includes(service) ? "selected" : ""} onClick={() => toggleService(service)}>{services.includes(service) && <Check size={14} />}{service}</button>)}</div>
        </div>}

        {step === 3 && <div className="match-step">
          <div className="question-icon"><Sparkles /></div><p className="step-label">The feeling</p><h2>What should your wedding feel like?</h2><p>Pick the style closest to your vision. You can always mix and change this later.</p>
          <div className="style-options">{styleOptions.map((item) => <button key={item} className={style === item ? "selected" : ""} onClick={() => setStyle(item)}><span className={`style-swatch ${item.toLowerCase()}`} /><strong>{item}</strong>{style === item && <Check />}</button>)}</div>
          <div className="priority-box"><Sparkles /><div><strong>Vowi will prioritise:</strong><p>Strong reviews · {location} availability · {budget} budget · {style.toLowerCase()} style · {guestCount.toLowerCase()}</p></div></div>
        </div>}

        <div className="match-step-actions"><button onClick={() => setStep((current) => current - 1)}><ArrowLeft size={16} /> Back</button><button className="button button-primary" onClick={() => setStep((current) => current + 1)}>{step === 3 ? "Build my shortlist" : "Continue"} {step === 3 ? <Sparkles size={17} /> : <ArrowRight size={17} />}</button></div>
      </section>}

      {step === 4 && <section className="match-results">
        <div className="results-heading"><div><p className="eyebrow"><span /> Your Vowi shortlist</p><h1>We found your<br /><em>strongest matches.</em></h1><p>Based on a {weddingType.toLowerCase()} in {location}, a {budget} vendor budget and your {style.toLowerCase()} style.</p></div><div className="result-summary"><span><strong>{matches.length}</strong>top matches</span><span><strong>{services.length}</strong>services</span><span><strong>{location}</strong>location</span></div></div>
        <div className="match-result-grid">{matches.map((vendor, index) => <article key={vendor.name}>
          <div className="result-image"><img src={vendor.image} alt={`${vendor.name} wedding portfolio`} /><span>{vendor.score}% match</span><button aria-label={`Save ${vendor.name}`}><Heart size={17} /></button></div>
          <div className="result-card-body"><div className="result-tier"><span>{vendor.category}</span><i>{vendor.tier}</i></div><h2>{vendor.name}</h2><p className="result-location"><MapPin size={14} /> {vendor.location} <span><Star size={13} fill="currentColor" /> {vendor.rating} ({vendor.reviews})</span></p><div className="match-reason"><Sparkles size={15} /><p><strong>Why Vowi picked this</strong>{vendor.reason}</p></div><div className="result-footer"><strong>{vendor.price}</strong>{index === 0 ? <Link href="/vendor/aurora-events">View profile <ChevronRight size={16} /></Link> : <button>View profile <ChevronRight size={16} /></button>}</div></div>
        </article>)}</div>
        <div className="results-bottom"><Link href="/couples/dashboard" className="button button-dark">Save shortlist & continue <ArrowRight size={17} /></Link><button onClick={() => setStep(1)}>Change my answers</button></div>
      </section>}
    </main>
  );
}
