import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/accounts";
import { listAccountQuotes } from "@/lib/quotes";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile) return NextResponse.json({ message: "Account setup required." }, { status: 409 });
  const quotes = await listAccountQuotes(userId, profile.role);
  return NextResponse.json({ quotes, role: profile.role });
}
