import { sql } from "drizzle-orm";
import { marketplaceVendors } from "@/db/schema";

export const restrictedMessage = "Your Smitten account is restricted. Contact support@smitten.com.ng for help.";

export function accountAccessResponse(profile: { accountStatus: string } | null) {
  return profile && profile.accountStatus !== "active"
    ? Response.json({ message: restrictedMessage, code: "ACCOUNT_RESTRICTED" }, { status: 403, headers: { "Cache-Control": "no-store" } })
    : null;
}

// A suspended vendor cannot be discovered, saved or contacted. Seed listings
// without an owner remain available. Independent listing moderation is preserved.
export function activeVendorOwner() {
  return sql`(${marketplaceVendors.ownerClerkUserId} IS NULL OR EXISTS (
    SELECT 1 FROM smitten_users owner WHERE owner.clerk_user_id=${marketplaceVendors.ownerClerkUserId} AND owner.account_status='active'
  ))`;
}
