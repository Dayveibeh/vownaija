"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { Clock3, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createIdleClock, SESSION_WARNING_MS } from "@/lib/session-idle";

export function SessionTimeoutGuard() {
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  const { signOut } = useClerk();
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [logoutError, setLogoutError] = useState(false);
  const activityRef = useRef<(() => void) | null>(null);
  const logoutRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !sessionId) return;
    const key = `smitten:session-activity:v2:${sessionId}`;
    // Accessing localStorage itself can throw in restricted browsers.
    let storage: Pick<Storage, "getItem" | "setItem">;
    try { storage = window.localStorage; }
    catch { storage = { getItem: () => null, setItem: () => {} }; }
    const clock = createIdleClock(storage, key);
    let cancelled = false;
    let signingOut = false;
    let lastAttempt = 0;
    let timer: number;
    const logout = async () => {
      if (cancelled || signingOut || Date.now() - lastAttempt < 3000) return;
      signingOut = true; lastAttempt = Date.now(); clock.expire(); setRemainingMs(0);
      const returnTo = `${window.location.pathname}${window.location.search}`;
      try {
        await signOut({ sessionId, redirectUrl: `/couples/sign-up?mode=signin&reason=session-timeout&returnTo=${encodeURIComponent(returnTo)}` });
      } catch { if (!cancelled) setLogoutError(true); }
      finally { signingOut = false; }
    };
    const check = () => {
      if (cancelled) return;
      const remaining = clock.remaining();
      setRemainingMs(remaining);
      if (remaining <= 0) void logout();
      window.clearTimeout(timer);
      timer = window.setTimeout(check, remaining > 0 ? Math.min(1000, remaining) : 3000);
    };
    let lastPointerMove = 0;
    const onActivity = (event?: Event) => {
      // Only actual interaction counts, including moving the mouse while reading.
      if (event && !event.isTrusted) return;
      if (event?.type === "pointermove") {
        if (Date.now() - lastPointerMove < 1000) return;
        lastPointerMove = Date.now();
      }
      if (!clock.activity()) { check(); return; }
      check();
    };
    const onVisibility = () => { if (document.visibilityState === "visible") check(); };
    const onStorage = (event: StorageEvent) => { if (event.key === key) check(); };
    const events = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel"] as const;
    events.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    activityRef.current = () => onActivity();
    logoutRef.current = () => { void logout(); };
    check();
    return () => {
      cancelled = true; window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, onActivity));
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
      activityRef.current = null; logoutRef.current = null;
    };
  }, [isLoaded, isSignedIn, sessionId, signOut]);

  if (!isLoaded || !isSignedIn || remainingMs === null || remainingMs > SESSION_WARNING_MS) return null;
  const expired = remainingMs <= 0;
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return <div className="session-timeout-backdrop" role="presentation">
    <section className="session-timeout-dialog" role="dialog" aria-modal="true" aria-labelledby="session-timeout-title">
      <div className="session-timeout-icon"><Clock3 /></div>
      <p className="eyebrow"><span /> Session security</p>
      <h2 id="session-timeout-title">{expired ? "Signing you out…" : "Still planning?"}</h2>
      <p>{expired ? (logoutError ? "Your session is idle. We’re retrying sign-out; please check your connection." : "You’ve been inactive for 10 minutes.") : `Smitten signs you out after 10 minutes of inactivity. Your session will end in about ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`}</p>
      <div className="session-timeout-actions">
        {!expired && <button type="button" className="stay" onClick={() => activityRef.current?.()}><ShieldCheck /> Stay signed in</button>}
        <button type="button" className="leave" onClick={() => logoutRef.current?.()}><LogOut />{expired ? "Retry sign-out" : "Sign out now"}</button>
      </div>
    </section>
  </div>;
}
