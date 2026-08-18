"use client";

import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, LockKeyhole, Mail, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Brand } from "./Brand";

type AccountRole = "couple" | "vendor";
type AuthMode = "signup" | "signin";
type AuthStep = "credentials" | "signup-code" | "signin-code" | "reset-email" | "reset-code" | "reset-password";

type FlowError = {
  code?: string;
  message?: string;
  longMessage?: string;
  long_message?: string;
};

function normaliseError(error: unknown): FlowError {
  if (!error || typeof error !== "object") return {};
  return error as FlowError;
}

function messageFor(error: unknown, context: "signup" | "signin" | "code" | "reset") {
  const clerkError = normaliseError(error);
  const code = clerkError.code ?? "";

  if (context === "signup" && (code.includes("identifier_exists") || code.includes("identifier_already"))) {
    return "An account already exists with this email. Sign in instead.";
  }
  if (context === "signin" && (code.includes("password") || code.includes("identifier") || code.includes("strategy"))) {
    return "Email or password is incorrect.";
  }
  if (context === "code") return clerkError.longMessage ?? clerkError.long_message ?? clerkError.message ?? "That code is incorrect or has expired.";
  if (context === "reset" && code.includes("password")) return clerkError.longMessage ?? clerkError.long_message ?? clerkError.message ?? "Choose a different password and try again.";
  return clerkError.longMessage ?? clerkError.long_message ?? clerkError.message ?? "Something went wrong. Please try again.";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    number: /\d/.test(password),
    special: /[^A-Za-z0-9\s]/.test(password),
  };
}

function PasswordRequirements({ password }: { password: string }) {
  const checks = passwordChecks(password);
  const completed = Object.values(checks).filter(Boolean).length;
  return (
    <div className="password-guidance">
      <div className="password-strength" aria-hidden="true">
        {[1, 2, 3].map((point) => <i className={completed >= point ? "met" : ""} key={point} />)}
      </div>
      <ul className="password-requirements" aria-label="Password requirements">
        <li className={checks.length ? "met" : ""}><Check /> 8+ characters</li>
        <li className={checks.number ? "met" : ""}><Check /> One number</li>
        <li className={checks.special ? "met" : ""}><Check /> One symbol</li>
      </ul>
    </div>
  );
}

export function AuthExperience({ role, initialMode = "signup", available = true }: { role: AccountRole; initialMode?: AuthMode; available?: boolean }) {
  if (!available) return <AuthUnavailable role={role} />;
  return <ClerkAuthExperience role={role} initialMode={initialMode} />;
}

function ClerkAuthExperience({ role, initialMode }: { role: AccountRole; initialMode: AuthMode }) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signUp, fetchStatus: signUpStatus } = useSignUp();
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>("credentials");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const busy = signUpStatus === "fetching" || signInStatus === "fetching";
  const copy = useMemo(() => role === "vendor" ? {
    eyebrow: "For wedding professionals",
    heading: <>Build a business couples can <em>trust.</em></>,
    intro: "Create your vendor account, publish your work and manage enquiries from one secure place.",
    benefits: ["A trusted profile for your business", "Quotes and enquiries in one workspace", "Access built for wedding professionals"],
    testimonial: "Smitten gives our work the thoughtful presentation it deserves.",
    witness: "Adaeze · Aurora Events NG",
  } : {
    eyebrow: "Plan with confidence",
    heading: <>Your wedding plans,<br /><em>beautifully organised.</em></>,
    intro: "Shortlist vendors, compare quotes and keep your planning details in one secure place.",
    benefits: ["Recommendations for every budget", "One place for quotes and messages", "Real reviews from Nigerian couples"],
    testimonial: "Smitten made it easy to find vendors we loved without going over budget.",
    witness: "Chioma & Obinna · Lagos",
  }, [role]);

  useEffect(() => {
    if (isSignedIn) router.replace(`/account/setup?intent=${role}`);
  }, [isSignedIn, role, router]);

  function clearFeedback() {
    setError("");
    setFieldErrors({});
    setNotice("");
  }

  async function authRequest<T>(request: () => Promise<T>): Promise<T | null> {
    try {
      return await request();
    } catch {
      setError("We couldn’t reach the secure account service. Check your connection and try again.");
      return null;
    }
  }

  function changeMode(nextMode: AuthMode) {
    clearFeedback();
    setMode(nextMode);
    setStep("credentials");
    setPassword("");
    setConfirmPassword("");
    setCode("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (nextMode === "signin") url.searchParams.set("mode", "signin");
      else url.searchParams.delete("mode");
      window.history.replaceState({}, "", url);
    }
    void signIn.reset();
    void signUp.reset();
  }

  function validatePasswordFields(includeConfirmation: boolean) {
    const checks = passwordChecks(password);
    const nextErrors: Record<string, string> = {};
    if (!checks.length || !checks.number || !checks.special) nextErrors.password = "Use 8+ characters with a number and special character.";
    if (includeConfirmation && password !== confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";
    setFieldErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  }

  function navigateAfterAuth() {
    return {
      navigate: ({ session, decorateUrl }: { session: { currentTask?: unknown } | null; decorateUrl: (url: string) => string }) => {
        if (session?.currentTask) {
          setError("Your account needs one more security check. Please follow the instructions sent by Clerk.");
          return;
        }
        const url = decorateUrl(`/account/setup?intent=${role}`);
        if (url.startsWith("http")) window.location.href = url;
        else router.replace(url);
      },
    };
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    const nextErrors: Record<string, string> = {};
    if (!validEmail(email)) nextErrors.email = "Enter a valid email address.";
    if (mode === "signup" && fullName.trim().length < 2) nextErrors.fullName = "Enter your full name.";
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    if (mode === "signup") {
      if (!validatePasswordFields(true)) return;
      const signUpResult = await authRequest(() => signUp.password({
        emailAddress: email.trim().toLowerCase(),
        password,
        unsafeMetadata: { smitten: { role, fullName: fullName.trim() } },
      }));
      if (!signUpResult) return;
      const { error: signUpError } = signUpResult;
      if (signUpError) {
        const message = messageFor(signUpError, "signup");
        setError(message);
        if (message.startsWith("An account")) setFieldErrors({ email: message });
        return;
      }
      const sendResult = await authRequest(() => signUp.verifications.sendEmailCode());
      if (!sendResult) return;
      const { error: sendError } = sendResult;
      if (sendError) {
        setError(messageFor(sendError, "signup"));
        return;
      }
      setStep("signup-code");
      setNotice(`We sent a six-digit verification code to ${email.trim().toLowerCase()}.`);
      return;
    }

    const signInResult = await authRequest(() => signIn.password({ emailAddress: email.trim().toLowerCase(), password }));
    if (!signInResult) return;
    const { error: signInError } = signInResult;
    if (signInError) {
      setError(messageFor(signInError, "signin"));
      return;
    }
    if (signIn.status === "complete") {
      await authRequest(() => signIn.finalize(navigateAfterAuth()));
      return;
    }
    if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
      const codeResult = await authRequest(() => signIn.mfa.sendEmailCode());
      if (!codeResult) return;
      const { error: codeError } = codeResult;
      if (codeError) {
        setError("This account needs another verification method. Please contact Smitten support.");
        return;
      }
      setStep("signin-code");
      setNotice("We sent a security code to the email address on your account.");
      return;
    }
    setError("We couldn’t complete sign-in. Please try again.");
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    if (!/^\d{6}$/.test(code.trim())) {
      setFieldErrors({ code: "Enter the six-digit code." });
      return;
    }

    if (step === "signup-code") {
      const verifyResult = await authRequest(() => signUp.verifications.verifyEmailCode({ code: code.trim() }));
      if (!verifyResult) return;
      const { error: verifyError } = verifyResult;
      if (verifyError) {
        setFieldErrors({ code: messageFor(verifyError, "code") });
        return;
      }
      if (signUp.status === "complete") await authRequest(() => signUp.finalize(navigateAfterAuth()));
      else setError("Your email was verified, but the account is still missing information. Please start again.");
      return;
    }

    if (step === "signin-code") {
      const verifyResult = await authRequest(() => signIn.mfa.verifyEmailCode({ code: code.trim() }));
      if (!verifyResult) return;
      const { error: verifyError } = verifyResult;
      if (verifyError) {
        setFieldErrors({ code: messageFor(verifyError, "code") });
        return;
      }
      if (signIn.status === "complete") await authRequest(() => signIn.finalize(navigateAfterAuth()));
      else setError("We couldn’t complete the security check. Please start again.");
      return;
    }

    const verifyResult = await authRequest(() => signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() }));
    if (!verifyResult) return;
    const { error: verifyError } = verifyResult;
    if (verifyError) {
      setFieldErrors({ code: messageFor(verifyError, "code") });
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setStep("reset-password");
  }

  async function resendCode() {
    clearFeedback();
    const result = await authRequest(() => step === "signup-code"
      ? signUp.verifications.sendEmailCode()
      : step === "signin-code"
        ? signIn.mfa.sendEmailCode()
        : signIn.resetPasswordEmailCode.sendCode());
    if (!result) return;
    if (result.error) setError(messageFor(result.error, "code"));
    else setNotice("A new code is on its way.");
  }

  async function sendResetCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    if (!validEmail(email)) {
      setFieldErrors({ email: "Enter the email address used for your account." });
      return;
    }
    const createResult = await authRequest(() => signIn.create({ identifier: email.trim().toLowerCase() }));
    if (!createResult) return;
    const { error: createError } = createResult;
    if (!createError) {
      const sendResult = await authRequest(() => signIn.resetPasswordEmailCode.sendCode());
      if (!sendResult) return;
      const { error: sendError } = sendResult;
      if (sendError) setError(messageFor(sendError, "reset"));
    }
    setCode("");
    setStep("reset-code");
    setNotice("If an account exists for that email, a reset code is on its way.");
  }

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    if (!validatePasswordFields(true)) return;
    const resetResult = await authRequest(() => signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    }));
    if (!resetResult) return;
    const { error: resetError } = resetResult;
    if (resetError) {
      setError(messageFor(resetError, "reset"));
      return;
    }
    if (signIn.status === "complete") await authRequest(() => signIn.finalize(navigateAfterAuth()));
    else setError("Your password changed, but sign-in could not be completed. Return to sign in with your new password.");
  }

  function title() {
    if (step === "signup-code") return "Verify your email";
    if (step === "signin-code") return "Confirm it’s you";
    if (step === "reset-email") return "Reset your password";
    if (step === "reset-code") return "Check your email";
    if (step === "reset-password") return "Choose a new password";
    return mode === "signup" ? (role === "vendor" ? "Create your vendor account" : "Create your free account") : "Welcome back";
  }

  return (
    <main className={`couple-auth-shell ${role === "vendor" ? "vendor-auth-shell" : ""}`}>
      <section className="couple-auth-visual">
        <Brand light />
        <div className="auth-visual-copy">
          <p className="eyebrow light"><span /> {copy.eyebrow}</p>
          <h1>{copy.heading}</h1>
          <p>{copy.intro}</p>
          <div className="auth-benefits">{copy.benefits.map((benefit) => <span key={benefit}><Check /> {benefit}</span>)}</div>
        </div>
        <div className="auth-visual-footer">
          <div className="auth-testimonial"><span>“</span><p>{copy.testimonial}</p><small>{copy.witness}</small></div>
          <span className="auth-trust-mark"><ShieldCheck /> Verified accounts · Private by design</span>
        </div>
      </section>

      <section className="couple-auth-main">
        <div className="couple-auth-top">
          <span className="auth-mobile-brand"><Brand priority /></span>
          <Link href="/"><ArrowLeft size={16} /> Back to marketplace</Link>
          <span>{role === "vendor" ? <>Planning a wedding? <Link href="/couples/sign-up">Create a couple account</Link></> : <>Are you a vendor? <Link href="/vendor/sign-up">List your business</Link></>}</span>
        </div>
        <div className="couple-auth-card">
          {step === "credentials" && <div className="auth-tabs" role="tablist" aria-label="Account access"><button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => changeMode("signup")}>Create account</button><button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""} onClick={() => changeMode("signin")}>Sign in</button></div>}

          <div className="auth-heading-row">
            <div className="auth-icon">{step.includes("code") ? <ShieldCheck /> : step.includes("reset") ? <KeyRound /> : <UserRound />}</div>
            <span className="auth-role-pill">{role === "vendor" ? "Vendor account" : "Couple account"}</span>
          </div>
          <h2>{title()}</h2>
          <p className="auth-intro">{step === "credentials" ? (mode === "signup" ? "Save favourites, manage quotes and keep your wedding plans together." : "Good to see you again. Sign in to pick up where you left off.") : step === "reset-password" ? "Choose a secure password you don’t use anywhere else." : "Enter the secure code from your email to continue."}</p>

          {(step === "signup-code" || (step === "credentials" && mode === "signup")) && <div className="auth-progress" aria-label={step === "signup-code" ? "Step 2 of 2" : "Step 1 of 2"}>
            <span className="complete"><b><Check /></b> Account details</span>
            <i />
            <span className={step === "signup-code" ? "active" : ""}><b>2</b> Verify email</span>
          </div>}

          {notice && <div className="auth-notice" role="status">{notice}</div>}
          {error && <div className="auth-error" role="alert">{error}</div>}

          {step === "credentials" && <form className="auth-form" onSubmit={submitCredentials} noValidate>
            {mode === "signup" && <AuthField label="Full name" error={fieldErrors.fullName}><UserRound size={18} /><input name="fullName" autoComplete="name" autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Amara Okoye" aria-invalid={Boolean(fieldErrors.fullName)} /></AuthField>}
            <AuthField label="Email address" error={fieldErrors.email}><Mail size={18} /><input name="email" type="email" inputMode="email" autoComplete="email" autoFocus={mode === "signin"} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" aria-invalid={Boolean(fieldErrors.email)} /></AuthField>
            <AuthField label="Password" error={fieldErrors.password}><LockKeyhole size={17} /><input name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "Create a password" : "Enter your password"} aria-invalid={Boolean(fieldErrors.password)} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></AuthField>
            {mode === "signup" && <><PasswordRequirements password={password} /><AuthField label="Confirm password" error={fieldErrors.confirmPassword}><LockKeyhole size={17} /><input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" aria-invalid={Boolean(fieldErrors.confirmPassword)} /></AuthField><div id="clerk-captcha" /></>}
            {mode === "signin" && <div className="auth-form-meta"><span><ShieldCheck /> Secure sign in</span><button type="button" onClick={() => { clearFeedback(); setStep("reset-email"); }}>Forgot password?</button></div>}
            <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create my account" : "Sign in"} {!busy && <ArrowRight size={17} />}</button>
            <p className="auth-button-note"><LockKeyhole /> Your details are encrypted and never shared with vendors.</p>
          </form>}

          {(step === "signup-code" || step === "signin-code" || step === "reset-code") && <form onSubmit={verifyCode} noValidate>
            <AuthField label="Six-digit code" error={fieldErrors.code}><ShieldCheck size={17} /><input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" aria-invalid={Boolean(fieldErrors.code)} /></AuthField>
            <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Checking…" : "Verify and continue"} {!busy && <ArrowRight size={17} />}</button>
            <button className="auth-secondary-action" type="button" onClick={resendCode} disabled={busy}><RefreshCw /> Send a new code</button>
          </form>}

          {step === "reset-email" && <form onSubmit={sendResetCode} noValidate>
            <AuthField label="Email address" error={fieldErrors.email}><Mail size={17} /><input name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" aria-invalid={Boolean(fieldErrors.email)} /></AuthField>
            <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset code"} {!busy && <ArrowRight size={17} />}</button>
          </form>}

          {step === "reset-password" && <form onSubmit={submitNewPassword} noValidate>
            <AuthField label="New password" error={fieldErrors.password}><LockKeyhole size={17} /><input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a new password" aria-invalid={Boolean(fieldErrors.password)} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></AuthField>
            <PasswordRequirements password={password} />
            <AuthField label="Confirm new password" error={fieldErrors.confirmPassword}><LockKeyhole size={17} /><input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" aria-invalid={Boolean(fieldErrors.confirmPassword)} /></AuthField>
            <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"} {!busy && <ArrowRight size={17} />}</button>
          </form>}

          {step !== "credentials" && <button className="auth-back-action" type="button" onClick={() => changeMode("signin")}><ArrowLeft /> Back to sign in</button>}
          <small className="auth-terms">By continuing, you agree to Smitten’s Terms and Privacy Policy.</small>
        </div>
      </section>
    </main>
  );
}

function AuthField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className={error ? "auth-field has-error" : "auth-field"}>{label}<div>{children}</div>{error && <small role="alert">{error}</small>}</label>;
}

function AuthUnavailable({ role }: { role: AccountRole }) {
  return (
    <main className="couple-auth-shell auth-unavailable-shell">
      <section className="couple-auth-visual"><Brand light /><div className="auth-visual-copy"><p className="eyebrow light"><span /> Secure accounts</p><h1>Your Smitten account,<br /><em>protected.</em></h1><p>We use verified email addresses and secure sessions to protect every account.</p></div></section>
      <section className="couple-auth-main"><div className="couple-auth-top"><Link href="/"><ArrowLeft size={16} /> Back to marketplace</Link></div><div className="couple-auth-card"><div className="auth-icon"><ShieldCheck /></div><h2>Accounts are temporarily unavailable</h2><p>The secure account service is not connected to this version of Smitten. Please try the live Vercel site or return shortly.</p><Link href="/" className="button button-primary auth-submit">Return home <ArrowRight /></Link><small className="auth-terms">Account type: {role}</small></div></section>
    </main>
  );
}
