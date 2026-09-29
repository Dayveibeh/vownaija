"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { Clock3, LogOut, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_IDLE_MINUTES = 30;
const DEFAULT_WARNING_MINUTES = 2;
const ACTIVITY_WRITE_THROTTLE_MS = 10_000;

function configuredMinutes(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function SessionTimeoutGuard() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { signOut } = useClerk();
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const signingOutRef = useRef(false);
  const lastWriteRef = useRef(0);

  const idleMinutes = configuredMinutes(
    process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES,
    DEFAULT_IDLE_MINUTES,
  );
  const warningMinutes = Math.min(
    idleMinutes,
    configuredMinutes(
      process.env.NEXT_PUBLIC_SESSION_TIMEOUT_WARNING_MINUTES,
      DEFAULT_WARNING_MINUTES,
    ),
  );
  const idleMs = idleMinutes * 60_000;
  const warningMs = warningMinutes * 60_000;
  const storageKey = userId ? `smitten:last-activity:${userId}` : "";

  const signOutForTimeout = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;

    const currentPath = typeof window === "undefined"
      ? "/"
      : `${window.location.pathname}${window.location.search}`;
    const redirectUrl = `/couples/sign-up?mode=signin&reason=session-timeout&returnTo=${encodeURIComponent(currentPath)}`;

    try {
      if (storageKey) window.localStorage.removeItem(storageKey);
      await signOut({ redirectUrl });
    } finally {
      signingOutRef.current = false;
    }
  }, [signOut, storageKey]);

  const recordActivity = useCallback((force = false) => {
    if (!storageKey || !isSignedIn) return;
    const now = Date.now();
    if (!force && now - lastWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;
    lastWriteRef.current = now;
    window.localStorage.setItem(storageKey, String(now));
    setWarningOpen(false);
    setRemainingMs(idleMs);
  }, [idleMs, isSignedIn, storageKey]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !storageKey) {
      setWarningOpen(false);
      setRemainingMs(null);
      return;
    }

    const existing = Number(window.localStorage.getItem(storageKey));
    if (!Number.isFinite(existing) || existing <= 0) recordActivity(true);

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
      "focus",
    ];
    const onActivity = () => recordActivity(false);
    const onVisibility = () => {
      if (document.visibilityState === "visible") recordActivity(false);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      const timestamp = Number(event.newValue);
      if (!Number.isFinite(timestamp)) return;
      setWarningOpen(false);
      setRemainingMs(Math.max(0, idleMs - (Date.now() - timestamp)));
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, onActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);

    const check = () => {
      const lastActivity = Number(window.localStorage.getItem(storageKey));
      if (!Number.isFinite(lastActivity) || lastActivity <= 0) {
        recordActivity(true);
        return;
      }

      const remaining = idleMs - (Date.now() - lastActivity);
      setRemainingMs(Math.max(0, remaining));

      if (remaining <= 0) {
        void signOutForTimeout();
        return;
      }

      setWarningOpen(remaining <= warningMs);
    };

    check();
    const timer = window.setInterval(check, 5_000);

    return () => {
      window.clearInterval(timer);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, onActivity);
      });
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, [
    idleMs,
    isLoaded,
    isSignedIn,
    recordActivity,
    signOutForTimeout,
    storageKey,
    userId,
    warningMs,
  ]);

  if (!isLoaded || !isSignedIn || !warningOpen || remainingMs === null) return null;

  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));

  return (
    <div className="session-timeout-backdrop" role="presentation">
      <section
        className="session-timeout-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
      >
        <div className="session-timeout-icon"><Clock3 /></div>
        <p className="eyebrow"><span /> Session security</p>
        <h2 id="session-timeout-title">Still planning?</h2>
        <p>
          For your security, Smitten will sign you out after {idleMinutes} minutes of inactivity.
          Your session will end in about {remainingMinutes} {remainingMinutes === 1 ? "minute" : "minutes"}.
        </p>
        <div className="session-timeout-actions">
          <button type="button" className="stay" onClick={() => recordActivity(true)}>
            <ShieldCheck /> Stay signed in
          </button>
          <button type="button" className="leave" onClick={() => void signOutForTimeout()}>
            <LogOut /> Sign out now
          </button>
        </div>
      </section>
    </div>
  );
}
