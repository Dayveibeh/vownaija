import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listNotifications } from "@/lib/notifications";
import NotificationsClient from "./notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/couples/sign-up?mode=signin");

  const notifications = await listNotifications(userId);
  return <NotificationsClient initialNotifications={notifications} />;
}
