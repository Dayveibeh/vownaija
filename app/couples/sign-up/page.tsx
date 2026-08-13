"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Eye, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "../../components/Brand";

export default function CoupleSignUpPage() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  function continueToPlanner(event: FormEvent) {
    event.preventDefault();
    router.push("/couples/match");
  }

  return (
    <main className="couple-auth-shell">
      <section className="couple-auth-visual">
        <Brand light />
        <div className="auth-visual-copy">
          <p className="eyebrow light"><span /> Plan with confidence</p>
          <h1>Your wedding plans,<br /><em>beautifully organised.</em></h1>
          <p>Shortlist vendors, compare quotes and get recommendations that respect your location, style and budget.</p>
          <div className="auth-benefits"><span><Check /> Recommendations for every budget</span><span><Check /> One place for quotes and messages</span><span><Check /> Real reviews from Nigerian couples</span></div>
        </div>
        <div className="auth-testimonial"><span>“</span><p>Smitten made it easy to find vendors we loved without going over budget.</p><small>Chioma & Obinna · Lagos</small></div>
      </section>

      <section className="couple-auth-main">
        <div className="couple-auth-top"><Link href="/"><ArrowLeft size={16} /> Back to marketplace</Link><span>Are you a vendor? <Link href="/onboarding">List your business</Link></span></div>
        <div className="couple-auth-card">
          <div className="auth-icon"><UserRound /></div>
          <p className="step-label">For couples</p>
          <h2>{mode === "signup" ? "Create your free account" : "Welcome back"}</h2>
          <p>{mode === "signup" ? "Save favourites, manage quotes and build a wedding team that fits your budget." : "Sign in to continue planning your celebration."}</p>

          <div className="auth-tabs"><button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button><button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button></div>

          <form onSubmit={continueToPlanner}>
            {mode === "signup" && <label>Your name<div><UserRound size={17} /><input required placeholder="Your full name" defaultValue="Amara Okoye" /></div></label>}
            <label>Email address<div><Mail size={17} /><input required type="email" placeholder="you@email.com" defaultValue={mode === "signin" ? "amara@example.com" : ""} /></div></label>
            <label>Password<div><LockKeyhole size={17} /><input required type={showPassword ? "text" : "password"} placeholder={mode === "signup" ? "Create a password" : "Enter your password"} defaultValue={mode === "signin" ? "weddingplans" : ""} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Show password"><Eye size={16} /></button></div></label>
            {mode === "signin" && <div className="auth-form-meta"><label><input type="checkbox" /> Remember me</label><button type="button" onClick={() => window.alert("Password recovery instructions will be sent to your email.")}>Forgot password?</button></div>}
            <button className="button button-primary auth-submit" type="submit">{mode === "signup" ? "Create my account" : "Sign in"} <ArrowRight size={17} /></button>
          </form>

          <div className="auth-next-note"><Sparkles size={16} /><span><strong>Next: optional AI matching</strong>Answer a few quick questions for personalised vendor suggestions—or skip straight to your dashboard.</span></div>
          <small className="auth-terms">By continuing, you agree to Smitten’s Terms and Privacy Policy.</small>
        </div>
      </section>
    </main>
  );
}
