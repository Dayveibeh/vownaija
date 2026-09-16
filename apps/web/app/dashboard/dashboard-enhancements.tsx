"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Check,
  CircleDollarSign,
  ExternalLink,
  Eye,
  FileText,
  LogOut,
  MessageSquare,
  Save,
  Settings,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import DashboardClient from "./dashboard-client";
import styles from "./dashboard-enhancements.module.css";

type Profile = { fullName: string; email: string; businessName: string };
type UtilityView = "insights" | "settings" | null;

type NotificationPreferences = {
  newEnquiries: boolean;
  messages: boolean;
  quoteActivity: boolean;
  weeklySummary: boolean;
};

const defaultNotifications: NotificationPreferences = {
  newEnquiries: true,
  messages: true,
  quoteActivity: true,
  weeklySummary: false,
};

export default function DashboardEnhancements({ profile }: { profile: Profile }) {
  const { signOut } = useClerk();
  const [utilityView, setUtilityView] = useState<UtilityView>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("smitten-vendor-notifications");
      if (stored) setNotifications({ ...defaultNotifications, ...JSON.parse(stored) });
    } catch {
      // Keep sensible defaults if local preferences are unavailable.
    }
  }, []);

  useEffect(() => {
    const insightButton = Array.from(document.querySelectorAll<HTMLButtonElement>(".dashboard-sidebar button"))
      .find((button) => button.textContent?.trim().startsWith("Insights"));
    const settingsButton = Array.from(document.querySelectorAll<HTMLButtonElement>(".dashboard-sidebar button"))
      .find((button) => button.textContent?.trim().startsWith("Settings"));
    const avatar = document.querySelector<HTMLElement>(".dashboard-topbar .user-avatar");

    const openInsights = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      setUtilityView("insights");
      setAccountOpen(false);
    };
    const openSettings = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      setUtilityView("settings");
      setAccountOpen(false);
    };
    const toggleAccount = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      setAccountOpen((current) => !current);
    };

    insightButton?.addEventListener("click", openInsights, true);
    settingsButton?.addEventListener("click", openSettings, true);
    avatar?.addEventListener("click", toggleAccount, true);
    if (avatar) {
      avatar.setAttribute("role", "button");
      avatar.setAttribute("tabindex", "0");
      avatar.setAttribute("aria-label", "Open account menu");
      avatar.style.cursor = "pointer";
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        setUtilityView(null);
      }
      if ((event.key === "Enter" || event.key === " ") && document.activeElement === avatar) toggleAccount(event);
    };
    const closeAccountOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountOpen && !menuRef.current?.contains(target) && target !== avatar) setAccountOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", closeAccountOnOutsideClick);

    return () => {
      insightButton?.removeEventListener("click", openInsights, true);
      settingsButton?.removeEventListener("click", openSettings, true);
      avatar?.removeEventListener("click", toggleAccount, true);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", closeAccountOnOutsideClick);
    };
  }, [accountOpen]);

  function savePreferences() {
    try {
      window.localStorage.setItem("smitten-vendor-notifications", JSON.stringify(notifications));
    } catch {
      // Saving to the account backend will replace this local fallback in a later phase.
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  async function logout() {
    setAccountOpen(false);
    await signOut({ redirectUrl: "/" });
  }

  const initials = profile.businessName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "SM";

  return (
    <>
      <DashboardClient profile={profile} />

      {accountOpen && (
        <div className={styles.accountMenu} ref={menuRef} role="menu">
          <div className={styles.accountIdentity}>
            <span>{initials}</span>
            <div><strong>{profile.fullName}</strong><small>{profile.email}</small></div>
          </div>
          <div className={styles.accountBusiness}><Store size={16} /><div><strong>{profile.businessName}</strong><small>Vendor workspace</small></div></div>
          <button type="button" onClick={() => { setUtilityView("settings"); setAccountOpen(false); }}><Settings size={17} /> Settings</button>
          <Link href="/vendor/aurora-events" role="menuitem"><ExternalLink size={17} /> View public profile</Link>
          <button type="button" className={styles.logoutButton} onClick={logout}><LogOut size={17} /> Log out</button>
        </div>
      )}

      {utilityView && (
        <section className={styles.utilityPanel} aria-label={utilityView === "insights" ? "Business insights" : "Business settings"}>
          <div className={styles.utilityInner}>
            <header className={styles.utilityHeader}>
              <div>
                <p>{utilityView === "insights" ? "Business performance" : "Workspace preferences"}</p>
                <h1>{utilityView === "insights" ? "Insights" : "Settings"}</h1>
                <span>{utilityView === "insights" ? "A clear view of how your Smitten profile is performing." : "Manage your vendor workspace and notification preferences."}</span>
              </div>
              <button type="button" onClick={() => setUtilityView(null)} aria-label="Close"><X /></button>
            </header>

            {utilityView === "insights" ? <InsightsView /> : (
              <SettingsView
                profile={profile}
                notifications={notifications}
                setNotifications={setNotifications}
                savePreferences={savePreferences}
                saved={saved}
                logout={logout}
              />
            )}
          </div>
        </section>
      )}
    </>
  );
}

function InsightsView() {
  return (
    <div className={styles.insightsContent}>
      <div className={styles.periodRow}><span>Last 30 days</span><small>Compared with the previous 30 days</small></div>
      <div className={styles.insightStats}>
        <article><span className={styles.metricIcon}><Eye /></span><div><small>Profile views</small><strong>1,284</strong><p><TrendingUp /> 18% increase</p></div></article>
        <article><span className={styles.metricIcon}><Users /></span><div><small>Enquiries</small><strong>42</strong><p><TrendingUp /> 12% increase</p></div></article>
        <article><span className={styles.metricIcon}><FileText /></span><div><small>Quotes accepted</small><strong>14</strong><p>33% enquiry conversion</p></div></article>
        <article><span className={styles.metricIcon}><CircleDollarSign /></span><div><small>Booking value</small><strong>₦12.8m</strong><p><TrendingUp /> 9% increase</p></div></article>
      </div>

      <div className={styles.insightGrid}>
        <article className={styles.surfaceCard}>
          <div className={styles.cardHeading}><div><p>Conversion funnel</p><h2>From discovery to booking</h2></div><BarChart3 /></div>
          <div className={styles.funnel}>
            <div><span>Profile views</span><i><b style={{ width: "100%" }} /></i><strong>1,284</strong></div>
            <div><span>Enquiries</span><i><b style={{ width: "72%" }} /></i><strong>42</strong></div>
            <div><span>Quotes sent</span><i><b style={{ width: "52%" }} /></i><strong>26</strong></div>
            <div><span>Bookings</span><i><b style={{ width: "34%" }} /></i><strong>14</strong></div>
          </div>
        </article>

        <article className={`${styles.surfaceCard} ${styles.highlightCard}`}>
          <span className={styles.highlightIcon}><TrendingUp /></span>
          <p>Best opportunity</p>
          <h2>Your profile gets the most enquiries between Thursday and Sunday.</h2>
          <span>Keeping your availability and portfolio fresh before the weekend could help convert more couples.</span>
        </article>
      </div>

      <article className={styles.surfaceCard}>
        <div className={styles.cardHeading}><div><p>Top enquiry types</p><h2>What couples are asking for</h2></div><MessageSquare /></div>
        <div className={styles.serviceRows}>
          <div><span>Full wedding planning</span><i><b style={{ width: "88%" }} /></i><strong>18 enquiries</strong></div>
          <div><span>Reception décor</span><i><b style={{ width: "64%" }} /></i><strong>13 enquiries</strong></div>
          <div><span>Day coordination</span><i><b style={{ width: "48%" }} /></i><strong>8 enquiries</strong></div>
          <div><span>Traditional wedding styling</span><i><b style={{ width: "32%" }} /></i><strong>3 enquiries</strong></div>
        </div>
      </article>
    </div>
  );
}

function SettingsView({
  profile,
  notifications,
  setNotifications,
  savePreferences,
  saved,
  logout,
}: {
  profile: Profile;
  notifications: NotificationPreferences;
  setNotifications: (value: NotificationPreferences) => void;
  savePreferences: () => void;
  saved: boolean;
  logout: () => Promise<void>;
}) {
  const updatePreference = (key: keyof NotificationPreferences) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
  };

  return (
    <div className={styles.settingsContent}>
      <article className={styles.surfaceCard}>
        <div className={styles.settingsTitle}><span><Store /></span><div><h2>Business account</h2><p>The details attached to this vendor workspace.</p></div></div>
        <div className={styles.accountDetails}>
          <div><small>Business name</small><strong>{profile.businessName}</strong></div>
          <div><small>Account holder</small><strong>{profile.fullName}</strong></div>
          <div><small>Email address</small><strong>{profile.email}</strong></div>
          <div><small>Market & currency</small><strong>Nigeria · NGN (₦)</strong></div>
        </div>
        <Link className={styles.inlineAction} href="/vendor/aurora-events">Manage public profile <ArrowRight size={15} /></Link>
      </article>

      <article className={styles.surfaceCard}>
        <div className={styles.settingsTitle}><span><BellRing /></span><div><h2>Notifications</h2><p>Choose which vendor updates you want to receive.</p></div></div>
        <div className={styles.toggleList}>
          <PreferenceToggle label="New enquiries" description="Notify me when a couple sends a new enquiry." checked={notifications.newEnquiries} onChange={() => updatePreference("newEnquiries")} />
          <PreferenceToggle label="Messages" description="Notify me when a customer replies to a conversation." checked={notifications.messages} onChange={() => updatePreference("messages")} />
          <PreferenceToggle label="Quote activity" description="Updates when a quote is viewed, accepted or changed." checked={notifications.quoteActivity} onChange={() => updatePreference("quoteActivity")} />
          <PreferenceToggle label="Weekly business summary" description="A weekly email with enquiries, quotes and profile performance." checked={notifications.weeklySummary} onChange={() => updatePreference("weeklySummary")} />
        </div>
        <button className={styles.saveButton} type="button" onClick={savePreferences}>{saved ? <><Check size={17} /> Saved</> : <><Save size={17} /> Save preferences</>}</button>
      </article>

      <article className={`${styles.surfaceCard} ${styles.securityCard}`}>
        <div className={styles.settingsTitle}><span><ShieldCheck /></span><div><h2>Account & security</h2><p>Your authentication is securely managed through your Smitten account.</p></div></div>
        <div className={styles.securityRow}><div><strong>Signed in as</strong><span>{profile.email}</span></div><button type="button" onClick={logout}><LogOut size={16} /> Log out</button></div>
      </article>
    </div>
  );
}

function PreferenceToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <button type="button" className={styles.preferenceToggle} onClick={onChange} aria-pressed={checked}>
      <span><strong>{label}</strong><small>{description}</small></span>
      <i className={checked ? styles.toggleOn : ""}><b /></i>
    </button>
  );
}
