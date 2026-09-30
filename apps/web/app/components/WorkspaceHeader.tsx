"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Brand } from "./Brand";
import { SessionAccountNav } from "./SessionAccountNav";

type WorkspaceRole = "couple" | "vendor" | "admin";
type Destination = { key: string; label: string; href: string };

const vendorLinks: Destination[] = [
  { key: "overview", label: "Overview", href: "/dashboard" },
  { key: "enquiries", label: "Enquiries", href: "/dashboard/enquiries" },
  { key: "quotes", label: "Quotes", href: "/dashboard/quotes" },
  { key: "bookings", label: "Bookings", href: "/dashboard/bookings" },
  { key: "payments", label: "Payments", href: "/dashboard/payments" },
  { key: "messages", label: "Messages", href: "/dashboard/messages" },
];
const vendorMore: Destination[] = [
  { key: "payouts", label: "Payout account", href: "/dashboard/payouts" },
  { key: "portfolio", label: "Portfolio", href: "/dashboard?view=portfolio" },
  { key: "reviews", label: "Reviews", href: "/dashboard?view=reviews" },
  { key: "insights", label: "Insights", href: "/dashboard?view=insights" },
  { key: "settings", label: "Settings", href: "/dashboard?view=settings" },
];
const coupleLinks: Destination[] = [
  { key: "overview", label: "Overview", href: "/couples/dashboard" },
  { key: "matches", label: "Matches", href: "/couples/match" },
  {
    key: "saved",
    label: "Saved vendors",
    href: "/couples/dashboard#couple-shortlist",
  },
  { key: "quotes", label: "Quotes", href: "/couples/quotes" },
  { key: "bookings", label: "Bookings", href: "/couples/bookings" },
  { key: "payments", label: "Payments", href: "/couples/payments" },
  { key: "messages", label: "Messages", href: "/couples/messages" },
];
const coupleMore: Destination[] = [
  { key: "budget", label: "Budget", href: "/couples/dashboard#couple-budget" },
  {
    key: "planning",
    label: "Planning",
    href: "/couples/dashboard#couple-planning",
  },
  {
    key: "settings",
    label: "Account settings",
    href: "/couples/dashboard?view=settings",
  },
];
const adminLinks: Destination[] = [
  { key: "finance", label: "Finance", href: "/admin/payments" },
  { key: "notifications", label: "Notifications", href: "/notifications" },
  { key: "marketplace", label: "Marketplace", href: "/" },
];

export function WorkspaceNavigation({
  role,
  activeSection,
}: {
  role: WorkspaceRole;
  activeSection?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links =
    role === "vendor"
      ? vendorLinks
      : role === "couple"
        ? coupleLinks
        : adminLinks;
  const more =
    role === "vendor" ? vendorMore : role === "couple" ? coupleMore : [];
  const activeKey =
    activeSection ??
    (pathname.startsWith("/bookings/")
      ? "bookings"
      : pathname.startsWith("/quotes/")
        ? "quotes"
        : pathname.startsWith("/messages/")
          ? "messages"
          : [...links, ...more].find(
              (item) => !/[?#]/.test(item.href) && item.href === pathname,
            )?.key);
  const renderLink = (item: Destination) => (
    <Link
      key={item.key}
      href={item.href}
      aria-current={activeKey === item.key ? "page" : undefined}
      onClick={(event) => {
        setOpen(false);
        const menu = event.currentTarget.closest("details");
        if (menu) menu.open = false;
      }}
    >
      {item.label}
    </Link>
  );

  return (
    <nav
      className={`workspace-navigation${open ? " is-open" : ""}`}
      aria-label={
        role === "vendor"
          ? "Vendor workspace"
          : role === "couple"
            ? "Wedding workspace"
            : "Admin workspace"
      }
    >
      <button
        className="workspace-navigation-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={18} /> : <Menu size={18} />} Workspace menu{" "}
        <ChevronDown size={16} />
      </button>
      <div className="workspace-navigation-links">
        {links.map(renderLink)}
        {more.length > 0 && (
          <details className="workspace-navigation-more">
            <summary>
              More <ChevronDown size={15} />
            </summary>
            <div>{more.map(renderLink)}</div>
          </details>
        )}
        <div className="workspace-navigation-mobile-more">
          {more.map(renderLink)}
        </div>
      </div>
    </nav>
  );
}

export function WorkspaceHeader({
  role,
  activeSection,
  accountControls,
  search,
  className = "",
}: {
  role: WorkspaceRole;
  activeSection?: string;
  accountControls?: ReactNode;
  search?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`workspace-topbar ${className}`}>
      <div className="workspace-topbar-row">
        <Brand />
        <div className="workspace-topbar-middle">
          {search ?? (
            <span className="workspace-topbar-label">
              {role === "vendor"
                ? "Vendor workspace"
                : role === "couple"
                  ? "My wedding workspace"
                  : "Admin workspace"}
            </span>
          )}
        </div>
        <div className="workspace-topbar-account">
          {accountControls ?? <SessionAccountNav variant="compact" />}
        </div>
      </div>
      <WorkspaceNavigation role={role} activeSection={activeSection} />
    </header>
  );
}
