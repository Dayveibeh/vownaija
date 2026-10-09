import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getVendorProfile, syncCurrentUserProfile } from "@/lib/accounts";
import type { UserRole } from "@/db/schema";

const schema = z.object({
  intent: z.enum(["couple", "vendor"]).optional(),
  returnTo: z.string().trim().max(500).optional(),
});

function safeReturnTo(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (
    value.startsWith("/couples/sign-up") ||
    value.startsWith("/vendor/sign-up") ||
    value.startsWith("/account/setup")
  ) return null;
  return value;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Session not ready." }, { status: 401 });

  let body: unknown = {};
  try { body = await request.json(); } catch { body = {}; }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Invalid account transition." }, { status: 400 });

  const fallbackRole: UserRole = parsed.data.intent === "vendor" ? "vendor" : "couple";
  const profile = await syncCurrentUserProfile(fallbackRole).catch((error: unknown) => {
    if (error instanceof Error && error.message === "ACCOUNT_RESTRICTED") return null;
    throw error;
  });
  if (!profile) return NextResponse.json({ destination: "/account/restricted" });
  const requestedReturn = safeReturnTo(parsed.data.returnTo);

  if (requestedReturn) {
    return NextResponse.json({
      destination: requestedReturn,
      role: profile.role,
      fullName: profile.fullName,
    });
  }

  if (profile.role === "admin") {
    return NextResponse.json({
      destination: "/admin",
      role: profile.role,
      fullName: profile.fullName,
    });
  }

  if (profile.role === "vendor") {
    const vendor = await getVendorProfile(profile.clerkUserId);
    return NextResponse.json({
      destination: vendor?.onboardingComplete ? "/dashboard" : "/onboarding",
      role: profile.role,
      fullName: profile.fullName,
    });
  }

  return NextResponse.json({
    destination: "/couples/dashboard",
    role: profile.role,
    fullName: profile.fullName,
  });
}
