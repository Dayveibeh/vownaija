import OnboardingClient from "./onboarding-client";
import { requireUserRole } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await requireUserRole("vendor");
  return <OnboardingClient account={{ fullName: profile.fullName, email: profile.email }} />;
}
