import { redirect } from "next/navigation";
import { getOwnedVendor } from "@/lib/vendor-workspace";
import DashboardEnhancements from "./dashboard-enhancements";
import { getVendorProfile, requireUserRole } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const profile = await requireUserRole("vendor");
  const vendor = await getVendorProfile(profile.clerkUserId);
  if (!vendor?.onboardingComplete) redirect("/onboarding");
  if ((await searchParams).view === "reviews") redirect("/dashboard/reviews");
  if ((await searchParams).view === "portfolio") redirect("/dashboard/profile#portfolio");
  const listing = await getOwnedVendor(profile.clerkUserId);
  return <DashboardEnhancements profile={{ fullName: profile.fullName, email: profile.email, businessName: vendor.businessName, vendorId: listing ? String(listing.id) : null }} />;
}
