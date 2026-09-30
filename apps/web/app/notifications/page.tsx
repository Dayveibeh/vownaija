import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/accounts";
import { listNotifications } from "@/lib/notifications";
import NotificationsClient from "./notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/couples/sign-up?mode=signin");

  const [notifications, profile] = await Promise.all([listNotifications(userId), getUserProfile(userId)]);
  return <NotificationsClient initialNotifications={notifications} role={profile?.role ?? "couple"} />;
}
