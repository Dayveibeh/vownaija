import { requireUserRole } from "@/lib/accounts";
import { listAccountPayments } from "@/lib/payments";
import { PaymentList } from "../../components/PaymentList";

export const dynamic = "force-dynamic";

export default async function CustomerPaymentsPage() {
  const profile = await requireUserRole("couple");
  const payments = await listAccountPayments(profile.clerkUserId, "couple");
  return <PaymentList payments={payments} role="couple" />;
}
