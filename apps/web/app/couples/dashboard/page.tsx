import CoupleDashboardClient from "./dashboard-client";
import { getCustomerPlanning } from "@/lib/customer-workspace";
import { requireUserRole } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function CoupleDashboardPage() {
  const profile = await requireUserRole("couple");
  return <CoupleDashboardClient profile={{ fullName: profile.fullName, email: profile.email }} planning={await getCustomerPlanning(profile.clerkUserId)} />;
}
