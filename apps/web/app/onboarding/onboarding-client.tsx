"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Instagram, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";
import { Brand } from "../components/Brand";
import { saveVendorProfile, type VendorOnboardingInput } from "./actions";

import { nigeriaStates, vendorServices as services, vendorProfileSchema } from "@/lib/vendor-validation";

export default function OnboardingClient({ account }: { account: { fullName: string; email: string } }) {
  const [step, setStep] = useState(1);
  const [service, setService] = useState("Planning & coordination");
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [publicVendorId, setPublicVendorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<VendorOnboardingInput>({
    businessName: "",
    contactName: account.fullName,
    businessEmail: account.email,
    phone: "",
    yearsInBusiness: "Just starting",
    primaryService: "Planning & coordination",
    location: "",
    state: "",
    travelDistance: "My city only",
    startingPrice: "",
    instagram: "",
    about: "",
  });

  function updateField(field: keyof VendorOnboardingInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  }

  function continueFromBusiness() {
    const nextErrors: Record<string, string> = {};
    if (form.businessName.trim().length < 2) nextErrors.businessName = "Enter your business name.";
    if (form.contactName.trim().length < 2) nextErrors.contactName = "Enter your full name.";
    if (!form.businessEmail.includes("@")) nextErrors.businessEmail = "Enter a valid business email.";
    if (form.phone.trim().length < 7) nextErrors.phone = "Enter a valid phone number.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStep(2);
  }

  function continueFromServices() {
    const nextErrors: Record<string, string> = {};
    if (form.location.trim().length < 2) nextErrors.location = "Enter the city or area where you work.";
    if (!form.state) nextErrors.state = "Choose your state.";
    const price = vendorProfileSchema.shape.startingPrice.safeParse(form.startingPrice);
    if (!price.success) nextErrors.startingPrice = price.error.issues[0].message;
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStep(3);
  }

  async function completeProfile() {
    setSaving(true); setError("");
    try {
      const result = await saveVendorProfile({ ...form, primaryService: service });
      if (!result.ok) {
        setError(result.message); setFieldErrors(result.fields ?? {});
        if (result.fields && ["businessName", "contactName", "businessEmail", "phone", "yearsInBusiness"].some((key) => result.fields?.[key])) setStep(1);
        else if (result.fields && ["primaryService", "location", "state", "travelDistance", "startingPrice"].some((key) => result.fields?.[key])) setStep(2);
        return;
      }
      setPublicVendorId(result.vendorId);
      if (portfolioFile) {
        const body = new FormData(); body.set("file", portfolioFile); body.set("cover", "true");
        const response = await fetch("/api/vendor-workspace/media", { method: "POST", body });
        const upload = await response.json();
        if (!response.ok) throw new Error(upload.message || "Your profile was saved, but the cover upload failed. Please try again or remove the cover and add it later.");
      }
      setStep(4);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "We couldn’t save your profile. Please try again."); }
    finally { setSaving(false); }
  }

  return (
    <main className="onboarding-shell">
      <aside className="onboarding-aside">
        <Brand light />
        <div>
          <p className="eyebrow light"><span /> Grow with us</p>
          <h1>Let more couples find your <em>best work.</em></h1>
          <p>Create a profile that feels like your brand, receive qualified enquiries and manage every conversation in one place.</p>
        </div>
        <div className="onboarding-proof">
          <div><strong>Your work</strong><span>in one portfolio</span></div>
          <div><strong>Your business</strong><span>in one workspace</span></div>
        </div>
      </aside>

      <section className="onboarding-main">
        <div className="onboarding-topbar">
          <Link href="/"><ArrowLeft size={17} /> Back home</Link>
          <span>Signed in as <strong>{account.email}</strong></span>
        </div>

        <div className="onboarding-card">
          <div className="step-progress">
            {[1, 2, 3].map((number) => <span key={number} className={step >= number ? "active" : ""} />)}
          </div>
          {error && <div className="onboarding-error" role="alert">{error}</div>}

          {step === 1 && (
            <div className="form-step">
              <div className="step-label">Step 1 of 3</div>
              <h2>Tell us about your business</h2>
              <p>This is the information couples will see first.</p>
              <div className="field-grid">
                <label className="full-field">Business name<input value={form.businessName} onChange={(event) => updateField("businessName", event.target.value)} placeholder="e.g. Aurora Events NG" aria-invalid={Boolean(fieldErrors.businessName)} />{fieldErrors.businessName && <small>{fieldErrors.businessName}</small>}</label>
                <label>Name and Surname<input value={form.contactName} onChange={(event) => updateField("contactName", event.target.value)} placeholder="e.g. John Okafor" aria-invalid={Boolean(fieldErrors.contactName)} />{fieldErrors.contactName && <small>{fieldErrors.contactName}</small>}</label>
                <label>Business email<input type="email" value={form.businessEmail} onChange={(event) => updateField("businessEmail", event.target.value)} placeholder="you@business.com" aria-invalid={Boolean(fieldErrors.businessEmail)} />{fieldErrors.businessEmail && <small>{fieldErrors.businessEmail}</small>}</label>
                <label>Phone number<input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+234" aria-invalid={Boolean(fieldErrors.phone)} />{fieldErrors.phone && <small>{fieldErrors.phone}</small>}</label>
                <label>Years in business<select value={form.yearsInBusiness} onChange={(event) => updateField("yearsInBusiness", event.target.value)}><option>Just starting</option><option>1–5 years</option><option>6–10 years</option><option>10+ years</option></select></label>
              </div>
              <button className="button button-primary next-step" onClick={continueFromBusiness}>Continue <ArrowRight size={18} /></button>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <div className="step-label">Step 2 of 3</div>
              <h2>What do you offer?</h2>
              <p>Choose your main service and where you work.</p>
              <label className="field-title">Primary service</label>
              <div className="service-options">
                {services.map((item) => <button type="button" key={item} className={service === item ? "selected" : ""} onClick={() => { setService(item); updateField("primaryService", item); }}>{service === item && <Check size={15} />}{item}</button>)}
              </div>
              <div className="field-grid location-fields">
                <label>Based in<div className="input-icon"><MapPin size={17} /><input value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="Lekki, Lagos" aria-invalid={Boolean(fieldErrors.location)} /></div>{fieldErrors.location && <small>{fieldErrors.location}</small>}</label>
                <label>State<select value={form.state} onChange={(event) => updateField("state", event.target.value)} aria-invalid={Boolean(fieldErrors.state)}><option value="">Choose your state</option>{nigeriaStates.map((state) => <option key={state}>{state}</option>)}</select>{fieldErrors.state && <small>{fieldErrors.state}</small>}</label>
                <label>Travel distance<select value={form.travelDistance} onChange={(event) => updateField("travelDistance", event.target.value)}><option>My city only</option><option>My state</option><option>Neighbouring states</option><option>Nationwide</option></select></label>
                <label className="full-field">Starting price<div className="input-prefix"><span>₦</span><input value={form.startingPrice} onChange={(event) => updateField("startingPrice", event.target.value)} inputMode="numeric" placeholder="850,000" aria-invalid={Boolean(fieldErrors.startingPrice)} /></div>{fieldErrors.startingPrice && <small>{fieldErrors.startingPrice}</small>}</label>
              </div>
              <div className="step-actions"><button className="back-button" onClick={() => setStep(1)}>Back</button><button className="button button-primary" onClick={continueFromServices}>Continue <ArrowRight size={18} /></button></div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <div className="step-label">Step 3 of 3</div>
              <h2>Bring your profile to life</h2>
              <p>Add a social link and a portfolio cover. You can add more later.</p>
              <label className="upload-box">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; if (file && file.size > 8 * 1024 * 1024) { setError("Choose a cover image under 8 MB."); event.target.value = ""; return; } setError(""); setPortfolioFile(file); }} />
                <span><ImagePlus size={26} /></span>
                <strong>{portfolioFile?.name || "Upload a cover image (optional)"}</strong>
                <small>JPG, PNG or WebP · up to 8 MB</small>
              </label>
              {portfolioFile && <button type="button" className="back-button" onClick={() => setPortfolioFile(null)}>Remove cover</button>}
              <div className="field-grid">
                <label className="full-field">Instagram<div className="input-icon"><Instagram size={17} /><input placeholder="instagram.com/yourbusiness" value={form.instagram} onChange={(event) => updateField("instagram", event.target.value)} /></div></label>
                <label className="full-field">About your business<textarea value={form.about} onChange={(event) => updateField("about", event.target.value)} placeholder="Tell couples what makes your work special." rows={4} aria-invalid={Boolean(fieldErrors.about)} />{fieldErrors.about && <small>{fieldErrors.about}</small>}</label>
              </div>
              <div className="step-actions"><button className="back-button" onClick={() => setStep(2)}>Back</button><button className="button button-primary" onClick={completeProfile} disabled={saving}>{saving ? "Saving profile…" : "Create my profile"} {!saving && <Sparkles size={18} />}</button></div>
            </div>
          )}

          {step === 4 && (
            <div className="success-step">
              <div className="success-icon"><Check size={34} /></div>
              <p className="eyebrow"><span /> You’re all set</p>
              <h2>Welcome to Smitten!</h2>
              <p>Your vendor profile is ready to personalise. Add your packages and portfolio, and keep your business details up to date.</p>
              <Link href="/dashboard" className="button button-primary">Open my dashboard <ArrowRight size={18} /></Link>
              <Link href={`/vendor/${publicVendorId}`} className="preview-profile-link">Preview my public profile</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
