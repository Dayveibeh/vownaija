"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Instagram, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";
import { Brand } from "../components/Brand";

const services = ["Planning & coordination", "Décor & styling", "Photography", "Catering", "Bridal beauty", "Music & entertainment", "Cakes", "Venues"];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [service, setService] = useState("Planning & coordination");
  const [portfolioFile, setPortfolioFile] = useState("");

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
          <div><strong>1,200+</strong><span>active vendors</span></div>
          <div><strong>36</strong><span>states covered</span></div>
        </div>
      </aside>

      <section className="onboarding-main">
        <div className="onboarding-topbar">
          <Link href="/"><ArrowLeft size={17} /> Back home</Link>
          <span>Already listed? <Link href="/dashboard">Sign in</Link></span>
        </div>

        <div className="onboarding-card">
          <div className="step-progress">
            {[1, 2, 3].map((number) => <span key={number} className={step >= number ? "active" : ""} />)}
          </div>

          {step === 1 && (
            <div className="form-step">
              <div className="step-label">Step 1 of 3</div>
              <h2>Tell us about your business</h2>
              <p>This is the information couples will see first.</p>
              <div className="field-grid">
                <label className="full-field">Business name<input defaultValue="Aurora Events NG" placeholder="e.g. Aurora Events NG" /></label>
                <label>Your name<input defaultValue="Adaeze Okafor" placeholder="Full name" /></label>
                <label>Business email<input type="email" defaultValue="hello@auroraevents.ng" placeholder="you@business.com" /></label>
                <label>Phone number<input defaultValue="+234 803 456 7890" placeholder="+234" /></label>
                <label>Years in business<select defaultValue="6–10 years"><option>Just starting</option><option>1–5 years</option><option>6–10 years</option><option>10+ years</option></select></label>
              </div>
              <button className="button button-primary next-step" onClick={() => setStep(2)}>Continue <ArrowRight size={18} /></button>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <div className="step-label">Step 2 of 3</div>
              <h2>What do you offer?</h2>
              <p>Choose your main service and where you work.</p>
              <label className="field-title">Primary service</label>
              <div className="service-options">
                {services.map((item) => <button key={item} className={service === item ? "selected" : ""} onClick={() => setService(item)}>{service === item && <Check size={15} />}{item}</button>)}
              </div>
              <div className="field-grid location-fields">
                <label>Based in<div className="input-icon"><MapPin size={17} /><input defaultValue="Lekki, Lagos" /></div></label>
                <label>Travel distance<select defaultValue="Nationwide"><option>My city only</option><option>My state</option><option>Neighbouring states</option><option>Nationwide</option></select></label>
                <label className="full-field">Starting price<div className="input-prefix"><span>₦</span><input defaultValue="850,000" /></div></label>
              </div>
              <div className="step-actions"><button className="back-button" onClick={() => setStep(1)}>Back</button><button className="button button-primary" onClick={() => setStep(3)}>Continue <ArrowRight size={18} /></button></div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <div className="step-label">Step 3 of 3</div>
              <h2>Bring your profile to life</h2>
              <p>Add a social link and a portfolio cover. You can add more later.</p>
              <label className="upload-box">
                <input type="file" accept="image/*,video/*" onChange={(event) => setPortfolioFile(event.target.files?.[0]?.name ?? "")} />
                <span><ImagePlus size={26} /></span>
                <strong>{portfolioFile || "Upload a cover image or video"}</strong>
                <small>JPG, PNG or MP4 · up to 50MB</small>
              </label>
              <div className="field-grid">
                <label className="full-field">Instagram<div className="input-icon"><Instagram size={17} /><input placeholder="instagram.com/yourbusiness" defaultValue="instagram.com/auroraeventsng" /></div></label>
                <label className="full-field">About your business<textarea defaultValue="We create considered, joy-filled celebrations that bring modern design and Nigerian tradition together." rows={4} /></label>
              </div>
              <div className="step-actions"><button className="back-button" onClick={() => setStep(2)}>Back</button><button className="button button-primary" onClick={() => setStep(4)}>Create my profile <Sparkles size={18} /></button></div>
            </div>
          )}

          {step === 4 && (
            <div className="success-step">
              <div className="success-icon"><Check size={34} /></div>
              <p className="eyebrow"><span /> You’re all set</p>
              <h2>Welcome to Smitten!</h2>
              <p>Your vendor profile is ready to personalise. Add your packages, portfolio and availability to start receiving enquiries.</p>
              <Link href="/dashboard" className="button button-primary">Open my dashboard <ArrowRight size={18} /></Link>
              <Link href="/vendor/aurora-events" className="preview-profile-link">Preview my public profile</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
