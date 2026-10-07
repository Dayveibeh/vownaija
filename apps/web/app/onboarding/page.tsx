import OnboardingClient from "./onboarding-client";
import { getVendorProfile, requireUserRole } from "@/lib/accounts";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await requireUserRole("vendor");
  if ((await getVendorProfile(profile.clerkUserId))?.onboardingComplete) redirect("/dashboard/profile");
  return <OnboardingClient account={{ fullName: profile.fullName, email: profile.email }} />;
}
