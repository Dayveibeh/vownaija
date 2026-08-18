import DashboardClient from "./dashboard-client";
import { getVendorProfile, requireUserRole } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireUserRole("vendor");
  const vendor = await getVendorProfile(profile.clerkUserId);
  return <DashboardClient profile={{ fullName: profile.fullName, email: profile.email, businessName: vendor?.businessName ?? "Your business" }} />;
}
