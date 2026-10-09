import { getUserProfile } from "@/lib/accounts";
import { accountAccessResponse } from "@/lib/account-access";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";

const patchSchema = z.object({
  id: z.string().trim().min(1).optional(),
  all: z.boolean().optional(),
}).refine((value) => value.all === true || Boolean(value.id), {
  message: "Choose a notification to update.",
});

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  const restricted = accountAccessResponse(await getUserProfile(userId)); if (restricted) return restricted;
  const url = new URL(request.url);
  const unreadCount = await getUnreadNotificationCount(userId);

  if (url.searchParams.get("summary") === "1") {
    return NextResponse.json({ unreadCount });
  }

  const notifications = await listNotifications(userId);
  return NextResponse.json({ unreadCount, notifications });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  const restricted = accountAccessResponse(await getUserProfile(userId)); if (restricted) return restricted;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid request." }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Invalid notification update." }, { status: 400 });

  if (parsed.data.all) await markAllNotificationsRead(userId);
  else if (parsed.data.id) await markNotificationRead(userId, parsed.data.id);

  return NextResponse.json({ ok: true, unreadCount: await getUnreadNotificationCount(userId) });
}
