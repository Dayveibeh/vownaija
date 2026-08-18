"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { ensureDatabaseSchema, getDb } from "@/db";
import { vendorProfiles } from "@/db/schema";
import { requireUserRole } from "@/lib/accounts";

const vendorProfileSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name").max(120),
  contactName: z.string().trim().min(2, "Enter your full name").max(120),
  businessEmail: z.string().trim().email("Enter a valid business email").max(254),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(30),
  yearsInBusiness: z.string().trim().min(1),
  primaryService: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2, "Enter the city or area where you work").max(160),
  travelDistance: z.string().trim().min(1),
  startingPrice: z.string().trim().max(24),
  instagram: z.string().trim().max(180),
  about: z.string().trim().min(20, "Tell couples a little more about your business").max(1200),
});

export type VendorOnboardingInput = z.infer<typeof vendorProfileSchema>;
export type VendorOnboardingResult = { ok: true } | { ok: false; message: string; fields?: Record<string, string> };

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

  const numericPrice = parsed.data.startingPrice.replace(/[^0-9.]/g, "");
  const startingPrice = numericPrice ? numericPrice : null;

  try {
    await ensureDatabaseSchema();
    await getDb().insert(vendorProfiles).values({
      clerkUserId: userId,
      ...parsed.data,
      startingPrice,
    }).onConflictDoUpdate({
      target: vendorProfiles.clerkUserId,
      set: { ...parsed.data, startingPrice, onboardingComplete: true, updatedAt: new Date() },
    });
    return { ok: true };
  } catch {
    return { ok: false, message: "We couldn’t save your profile just now. Please try again." };
  }
}
