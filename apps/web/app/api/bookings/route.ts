import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/accounts";
import { listAccountBookings } from "@/lib/quotes";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile) return NextResponse.json({ message: "Account setup required." }, { status: 409 });
  const bookings = await listAccountBookings(userId, profile.role);
  return NextResponse.json({ bookings, role: profile.role });
}
