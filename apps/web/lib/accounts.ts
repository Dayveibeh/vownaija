import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ensureDatabaseSchema, getDb } from "@/db";
import { customerProfiles, users, vendorProfiles, type SmittenUser, type UserRole } from "@/db/schema";

export function isClerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

function roleFromMetadata(
  unsafeMetadata: Record<string, unknown> | undefined,
  privateMetadata: Record<string, unknown> | undefined,
  fallback: UserRole,
): UserRole {
  const privateSmitten = privateMetadata?.smitten;
  if (privateSmitten && typeof privateSmitten === "object" && "role" in privateSmitten) {
    const trustedRole = (privateSmitten as { role?: unknown }).role;
    if (trustedRole === "admin") return "admin";
  }

  const unsafeSmitten = unsafeMetadata?.smitten;
  if (unsafeSmitten && typeof unsafeSmitten === "object" && "role" in unsafeSmitten) {
    const role = (unsafeSmitten as { role?: unknown }).role;
    if (role === "couple" || role === "vendor") return role;
  }

  return fallback === "admin" ? "couple" : fallback;
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

export async function getCustomerProfile(clerkUserId: string) {
  await ensureDatabaseSchema();
  const [profile] = await getDb().select().from(customerProfiles).where(eq(customerProfiles.clerkUserId, clerkUserId)).limit(1);
  return profile ?? null;
}

export async function getVendorProfile(clerkUserId: string) {
  await ensureDatabaseSchema();
  const [profile] = await getDb().select().from(vendorProfiles).where(eq(vendorProfiles.clerkUserId, clerkUserId)).limit(1);
  return profile ?? null;
}

async function ensureRoleProfile(clerkUserId: string, role: UserRole) {
  if (role !== "couple") return;

  await getDb().insert(customerProfiles).values({
    clerkUserId,
    currencyCode: "NGN",
  }).onConflictDoNothing({ target: customerProfiles.clerkUserId });
}

export async function syncCurrentUserProfile(fallbackRole: UserRole = "couple"): Promise<SmittenUser> {
  const { userId } = await auth();
  if (!userId) redirect(`/couples/sign-up?mode=signin`);

  const clerkUser = await currentUser();
  if (!clerkUser) redirect(`/couples/sign-up?mode=signin`);

  const email = clerkUser.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!email) throw new Error("Your Clerk account does not have a verified email address.");

  const unsafeMetadata = clerkUser.unsafeMetadata as Record<string, unknown> | undefined;
  const privateMetadata = clerkUser.privateMetadata as Record<string, unknown> | undefined;

  await ensureDatabaseSchema();
  const [existingProfile] = await getDb().select().from(users).where(eq(users.clerkUserId, userId)).limit(1);
  const fallback = existingProfile?.role === "admin" ? "couple" : (existingProfile?.role ?? fallbackRole);
  const role = roleFromMetadata(unsafeMetadata, privateMetadata, fallback);
  const metadataName = nameFromMetadata(unsafeMetadata);
  const clerkName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();
  const fullName = metadataName === "Smitten member" ? (clerkName || email.split("@")[0]) : metadataName;

  const [profile] = await getDb().insert(users).values({
    clerkUserId: userId,
    email,
    fullName,
    role,
    countryCode: "NG",
    currencyCode: "NGN",
  }).onConflictDoUpdate({
    target: users.clerkUserId,
    set: { email, fullName, role, updatedAt: new Date() },
  }).returning();

  await ensureRoleProfile(userId, profile.role);
  return profile;
}

export async function requireUserRole(expectedRole: UserRole) {
  if (!isClerkConfigured()) redirect(`/couples/sign-up?service=unavailable`);

  const { userId } = await auth();
  if (!userId) {
    const route = expectedRole === "vendor" ? "/vendor/sign-up" : "/couples/sign-up";
    redirect(`${route}?mode=signin`);
  }

  const profile = expectedRole === "admin"
    ? await syncCurrentUserProfile("couple")
    : (await getUserProfile(userId)) ?? await syncCurrentUserProfile(expectedRole);
  if (profile.role !== expectedRole) {
    redirect(profile.role === "vendor" ? "/dashboard" : "/couples/dashboard");
  }

  await ensureRoleProfile(userId, profile.role);
  return profile;
}
