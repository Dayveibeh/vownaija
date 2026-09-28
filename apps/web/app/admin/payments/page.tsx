import { requireUserRole } from "@/lib/accounts";
import { listAdminFinancePayments } from "@/lib/payments";
import AdminFinanceClient from "./admin-finance-client";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireUserRole("admin");
  const payments = await listAdminFinancePayments();
  return <AdminFinanceClient initialPayments={payments} />;
}
