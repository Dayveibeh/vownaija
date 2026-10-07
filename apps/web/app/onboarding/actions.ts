"use server";

import { auth } from "@clerk/nextjs/server";
import { requireUserRole } from "@/lib/accounts";
import { saveVendorProfileAndListing } from "@/lib/vendor-listings";
import { vendorProfileSchema, type VendorProfileForm } from "@/lib/vendor-validation";
import { getOwnedVendor } from "@/lib/vendor-workspace";

export type VendorOnboardingInput = VendorProfileForm;
export type VendorOnboardingResult = { ok: true; vendorId: string } | { ok: false; message: string; fields?: Record<string, string> };

export async function saveVendorProfile(input: VendorOnboardingInput): Promise<VendorOnboardingResult> {
  const parsed = vendorProfileSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fields[key]) fields[key] = issue.message;
    }
    return { ok: false, message: "Please check the highlighted details.", fields };
  }

  const account = await requireUserRole("vendor");
  const { userId } = await auth();
  if (!userId || account.clerkUserId !== userId) return { ok: false, message: "Please sign in again." };

  try {
    await saveVendorProfileAndListing({
      clerkUserId: userId,
      ...parsed.data,
    });
    const vendor = await getOwnedVendor(userId);
    if (!vendor) throw new Error("PROFILE_NOT_FOUND");
    return { ok: true, vendorId: String(vendor.id) };
  } catch {
    return { ok: false, message: "We couldn’t save your profile just now. Please try again." };
  }
}
