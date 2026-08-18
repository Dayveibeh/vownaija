import { redirect } from "next/navigation";
import { getVendorProfile, isClerkConfigured, syncCurrentUserProfile } from "@/lib/accounts";
import type { UserRole } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AccountSetupPage({ searchParams }: { searchParams: Promise<{ intent?: string }> }) {
  if (!isClerkConfigured()) redirect("/couples/sign-up?service=unavailable");

  const { intent } = await searchParams;
  const fallbackRole: UserRole = intent === "vendor" ? "vendor" : "couple";
  const profile = await syncCurrentUserProfile(fallbackRole);

  if (profile.role === "vendor") {
    const vendorProfile = await getVendorProfile(profile.clerkUserId);
    redirect(vendorProfile?.onboardingComplete ? "/dashboard" : "/onboarding");
  }

  redirect("/couples/dashboard");
}
