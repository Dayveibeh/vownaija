import { requireUserRole } from "@/lib/accounts";
import { getVendorPayoutProfile } from "@/lib/payments";
import PayoutSettingsClient from "./payout-settings-client";

export const dynamic = "force-dynamic";

export default async function VendorPayoutSettingsPage() {
  const profile = await requireUserRole("vendor");
  const payoutProfile = await getVendorPayoutProfile(profile.clerkUserId);
  return <PayoutSettingsClient initialProfile={payoutProfile} />;
}
