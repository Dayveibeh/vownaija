import { requireUserRole } from "@/lib/accounts";
import { getCustomerPlanning } from "@/lib/customer-workspace";
import PlanningClient from "./planning-client";

export const dynamic = "force-dynamic";
export default async function PlanningPage() {
  const account = await requireUserRole("couple");
  return <PlanningClient initial={await getCustomerPlanning(account.clerkUserId)} />;
}
