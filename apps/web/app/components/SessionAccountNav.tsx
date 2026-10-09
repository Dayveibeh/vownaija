"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { ArrowRight, Bell, LayoutDashboard, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AccountRole = "couple" | "vendor" | "admin";
type Variant = "desktop" | "mobile" | "compact";

function roleFromMetadata(metadata: Record<string, unknown> | undefined): AccountRole {
  const smitten = metadata?.smitten;
  if (smitten && typeof smitten === "object" && "role" in smitten) {
    const role = (smitten as { role?: unknown }).role;
    if (role === "vendor") return role;
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setAccount(null);
      setUnreadNotifications(0);
      return;
    }

    let cancelled = false;

    const refreshSession = async () => {
      const [accountResult, notificationResult] = await Promise.all([
        fetch("/api/account/session", { cache: "no-store" })
          .then(async (response) => {
            const result = await response.json();
            if (response.status === 403 && result.code === "ACCOUNT_RESTRICTED" && window.location.pathname !== "/account/restricted") window.location.assign("/account/restricted");
            return response.ok ? result : null;
          })
          .catch(() => null),
        fetch("/api/notifications?summary=1", { cache: "no-store" })
          .then(async (response) => response.ok ? response.json() : null)
          .catch(() => null),
      ]);

      if (cancelled) return;
      if (accountResult?.profile) {
        setAccount({
          role: accountResult.profile.role,
          fullName: accountResult.profile.fullName,
        });
      }
      setUnreadNotifications(Number(notificationResult?.unreadCount ?? 0));
    };

    void refreshSession();
    const timer = window.setInterval(() => void refreshSession(), 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isLoaded, isSignedIn]);

  const role = account?.role ?? metadataRole;
  const fullName = account?.fullName ?? user?.fullName ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "Smitten member";
  const initials = useMemo(() => initialsFor(fullName), [fullName]);
  const dashboardHref = role === "admin" ? "/admin" : role === "vendor" ? "/dashboard" : "/couples/dashboard";
  const dashboardLabel = role === "admin" ? "Admin workspace" : role === "vendor" ? "Vendor workspace" : "My planning";

  if (!isLoaded) {
    return <span className={`session-account-loading session-account-${variant}`} aria-hidden="true" />;
  }

  if (isSignedIn) {
    return (
      <div className={`session-account-cluster session-account-cluster-${variant}`}>
        <Link
          href="/notifications"
          className="session-notification-link"
          onClick={onNavigate}
          aria-label={unreadNotifications > 0 ? `${unreadNotifications} unread notifications` : "Open notifications"}
        >
          <Bell size={16} />
          {unreadNotifications > 0 && <span>{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}
        </Link>
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
      </div>
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
