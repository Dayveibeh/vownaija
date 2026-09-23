"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { ArrowRight, LayoutDashboard, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AccountRole = "couple" | "vendor" | "admin";
type Variant = "desktop" | "mobile" | "compact";

function roleFromMetadata(metadata: Record<string, unknown> | undefined): AccountRole {
  const smitten = metadata?.smitten;
  if (smitten && typeof smitten === "object" && "role" in smitten) {
    const role = (smitten as { role?: unknown }).role;
    if (role === "vendor" || role === "admin") return role;
  }
  return "couple";
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "SM";
}

export function SessionAccountNav({
  variant = "desktop",
  withVendorJoin = false,
  onNavigate,
}: {
  variant?: Variant;
  withVendorJoin?: boolean;
  onNavigate?: () => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const metadataRole = roleFromMetadata(user?.unsafeMetadata as Record<string, unknown> | undefined);
  const [account, setAccount] = useState<{ role: AccountRole; fullName: string } | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setAccount(null);
      return;
    }

    let cancelled = false;
    void fetch("/api/account/session", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((result) => {
        if (cancelled || !result?.profile) return;
        setAccount({
          role: result.profile.role,
          fullName: result.profile.fullName,
        });
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn]);

  const role = account?.role ?? metadataRole;
  const fullName = account?.fullName ?? user?.fullName ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "Smitten member";
  const initials = useMemo(() => initialsFor(fullName), [fullName]);
  const dashboardHref = role === "vendor" || role === "admin" ? "/dashboard" : "/couples/dashboard";
  const dashboardLabel = role === "vendor" || role === "admin" ? "Vendor workspace" : "My planning";

  if (!isLoaded) {
    return <span className={`session-account-loading session-account-${variant}`} aria-hidden="true" />;
  }

  if (isSignedIn) {
    return (
      <Link
        href={dashboardHref}
        className={`session-account session-account-${variant}`}
        onClick={onNavigate}
        aria-label={`Open ${dashboardLabel}`}
      >
        <span className="session-avatar">{initials}</span>
        <span className="session-account-copy">
          <strong>{dashboardLabel}</strong>
          {variant !== "compact" && <small>Signed in as {fullName}</small>}
        </span>
        {variant !== "compact" && <LayoutDashboard size={16} />}
      </Link>
    );
  }

  return (
    <div className={`session-signed-out session-signed-out-${variant}`}>
      <Link href="/couples/sign-up?mode=signin" className="session-sign-in" onClick={onNavigate}>
        <UserRound size={15} /> Sign in
      </Link>
      {withVendorJoin && (
        <Link href="/vendor/sign-up" className="button button-dark button-small session-vendor-join" onClick={onNavigate}>
          Join as vendor {variant === "mobile" && <ArrowRight size={16} />}
        </Link>
      )}
    </div>
  );
}
