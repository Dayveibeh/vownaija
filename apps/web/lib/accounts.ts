import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ensureDatabaseSchema, getDb } from "@/db";
import { users, vendorProfiles, type SmittenUser, type UserRole } from "@/db/schema";

export function isClerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

function roleFromMetadata(metadata: Record<string, unknown> | undefined, fallback: UserRole): UserRole {
  const smitten = metadata?.smitten;
  if (smitten && typeof smitten === "object" && "role" in smitten) {
    const role = (smitten as { role?: unknown }).role;
    if (role === "couple" || role === "vendor") return role;
  }
  return fallback;
}

function nameFromMetadata(metadata: Record<string, unknown> | undefined) {
  const smitten = metadata?.smitten;
  if (smitten && typeof smitten === "object" && "fullName" in smitten) {
    const fullName = (smitten as { fullName?: unknown }).fullName;
    if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  }
  return "Smitten member";
}

export async function getUserProfile(clerkUserId: string) {
  await ensureDatabaseSchema();
  const [profile] = await getDb().select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  return profile ?? null;
}

export async function getVendorProfile(clerkUserId: string) {
  await ensureDatabaseSchema();
  const [profile] = await getDb().select().from(vendorProfiles).where(eq(vendorProfiles.clerkUserId, clerkUserId)).limit(1);
  return profile ?? null;
}

export async function syncCurrentUserProfile(fallbackRole: UserRole = "couple"): Promise<SmittenUser> {
  const { userId } = await auth();
  if (!userId) redirect(`/couples/sign-up?mode=signin`);

  const clerkUser = await currentUser();
  if (!clerkUser) redirect(`/couples/sign-up?mode=signin`);

  const email = clerkUser.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!email) throw new Error("Your Clerk account does not have a verified email address.");

  const metadata = clerkUser.unsafeMetadata as Record<string, unknown> | undefined;
  const role = roleFromMetadata(metadata, fallbackRole);
  const metadataName = nameFromMetadata(metadata);
  const clerkName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();
  const fullName = metadataName === "Smitten member" ? (clerkName || email.split("@")[0]) : metadataName;

  await ensureDatabaseSchema();
  const [profile] = await getDb().insert(users).values({
    clerkUserId: userId,
    email,
    fullName,
    role,
  }).onConflictDoUpdate({
    target: users.clerkUserId,
    set: { email, fullName, updatedAt: new Date() },
  }).returning();

  return profile;
}

export async function requireUserRole(expectedRole: UserRole) {
  if (!isClerkConfigured()) redirect(`/couples/sign-up?service=unavailable`);

  const { userId } = await auth();
  if (!userId) {
    const route = expectedRole === "vendor" ? "/vendor/sign-up" : "/couples/sign-up";
    redirect(`${route}?mode=signin`);
  }

  const profile = (await getUserProfile(userId)) ?? await syncCurrentUserProfile(expectedRole);
  if (profile.role !== expectedRole) {
    redirect(profile.role === "vendor" ? "/dashboard" : "/couples/dashboard");
  }

  return profile;
}
