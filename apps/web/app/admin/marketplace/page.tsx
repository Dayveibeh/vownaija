import { requireUserRole } from "@/lib/accounts";
import { getAdminMarketplace } from "@/lib/reviews";
import AdminMarketplaceClient from "./marketplace-client";
export const dynamic = "force-dynamic";
export default async function AdminMarketplacePage() {
  await requireUserRole("admin");
  return <AdminMarketplaceClient initialMarketplace={await getAdminMarketplace()} />;
}
