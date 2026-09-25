import { requireUserRole } from "@/lib/accounts";
import { listAccountPayments } from "@/lib/payments";
import { PaymentList } from "../../components/PaymentList";

export const dynamic = "force-dynamic";

export default async function VendorPaymentsPage() {
  const profile = await requireUserRole("vendor");
  const payments = await listAccountPayments(profile.clerkUserId, "vendor");
  return <PaymentList payments={payments} role="vendor" />;
}
