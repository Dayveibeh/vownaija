"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CreditCard,
  HandCoins,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { NotificationView } from "@/lib/notifications";
import { WorkspaceHeader } from "../components/WorkspaceHeader";

function timeLabel(value: string) {
  const date = new Date(value);
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function NotificationIcon({ type }: { type: string }) {
  if (type.startsWith("refund.")) return <RotateCcw />;
  if (type.startsWith("dispute.")) return <AlertTriangle />;
  if (type.startsWith("payout.")) return <HandCoins />;
  if (type.startsWith("deposit.") || type.startsWith("balance.") || type.startsWith("payment.")) return <CreditCard />;
  return <ShieldCheck />;
}

export default function NotificationsClient({
  initialNotifications,
  role,
}: {
  initialNotifications: NotificationView[];
  role: "couple" | "vendor" | "admin";
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [markingAll, setMarkingAll] = useState(false);
  const unread = useMemo(() => notifications.filter((item) => !item.readAt).length, [notifications]);

  async function markAllRead() {
    if (!unread || markingAll) return;
    setMarkingAll(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (response.ok) {
        const now = new Date().toISOString();
        setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || now })));
      }
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(notification: NotificationView) {
    if (!notification.readAt) {
      const now = new Date().toISOString();
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, readAt: now } : item));
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification.id }),
      }).catch(() => undefined);
    }
    if (notification.href) router.push(notification.href);
  }

  return (
    <main className="notifications-page">
      <WorkspaceHeader role={role} />

      <section className="notifications-shell">
        <header className="notifications-heading">
          <div>
            <p className="eyebrow"><span /> Activity</p>
            <h1>Notifications</h1>
            <p>Payments, booking protection, disputes and payout updates in one place.</p>
          </div>
          <div className="notifications-heading-actions">
            <span><Bell size={15} /> {unread} unread</span>
            <button type="button" disabled={!unread || markingAll} onClick={() => void markAllRead()}>
              <CheckCheck size={15} /> {markingAll ? "Updating…" : "Mark all read"}
            </button>
          </div>
        </header>

        {notifications.length === 0 ? <section className="notifications-empty">
          <Bell />
          <h2>Nothing new yet</h2>
          <p>Important Smitten activity will appear here as your bookings progress.</p>
        </section> : <section className="notifications-list">
          {notifications.map((notification) => (
            <button
              type="button"
              key={notification.id}
              className={notification.readAt ? "notification-card" : "notification-card unread"}
              onClick={() => void openNotification(notification)}
            >
              <span className="notification-icon"><NotificationIcon type={notification.type} /></span>
              <span className="notification-copy">
                <span><strong>{notification.title}</strong><small>{timeLabel(notification.createdAt)}</small></span>
                <p>{notification.body}</p>
                {notification.href && <small className="notification-open">Open details →</small>}
              </span>
              <span className="notification-state">{notification.readAt ? <Check size={14} /> : <i />}</span>
            </button>
          ))}
        </section>}
      </section>
    </main>
  );
}
