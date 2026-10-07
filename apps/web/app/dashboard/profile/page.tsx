import { redirect } from "next/navigation";
import { getVendorProfile, requireUserRole } from "@/lib/accounts";
import { listVendorPackages } from "@/lib/marketplace";
import { getOwnedVendor } from "@/lib/vendor-workspace";
import VendorStudio from "./vendor-studio";

export const dynamic = "force-dynamic";
export default async function VendorProfileEditorPage() {
  const account = await requireUserRole("vendor");
  const [profile, listing] = await Promise.all([getVendorProfile(account.clerkUserId), getOwnedVendor(account.clerkUserId)]);
  if (!profile || !listing) redirect("/onboarding");
  const packages = await listVendorPackages(String(listing.id));
  return <VendorStudio initialProfile={{
    businessName: profile.businessName, contactName: profile.contactName,
    businessEmail: profile.businessEmail, phone: profile.phone,
    yearsInBusiness: profile.yearsInBusiness, primaryService: profile.primaryService,
    location: profile.location, state: profile.state || "", travelDistance: ["My city only", "My state", "Neighbouring states", "Nationwide"].includes(profile.travelDistance) ? profile.travelDistance as "My city only" | "My state" | "Neighbouring states" | "Nationwide" : "Nationwide",
    startingPrice: profile.startingPrice || "0", instagram: profile.instagram || "", about: profile.about || "",
  }} vendorId={String(listing.id)} imageUrl={String(listing.image_url)} gallery={listing.gallery as string[]} packages={packages} />;
}
