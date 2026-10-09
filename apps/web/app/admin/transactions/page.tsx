import { requireUserRole } from "@/lib/accounts";
import { listAdminTransactions, transactionFilters } from "@/lib/admin-workspace";
import AdminTransactionsClient from "./transactions-client";
export const dynamic = "force-dynamic";
export default async function AdminTransactionsPage({ searchParams }: { searchParams: Promise<Record<string,string | string[] | undefined>> }) {
  await requireUserRole("admin");
  const parsed = transactionFilters.safeParse(await searchParams);
  const filters = parsed.success ? parsed.data : transactionFilters.parse({});
  return <AdminTransactionsClient key={JSON.stringify(filters)} filters={filters} initial={await listAdminTransactions(filters)} invalidFilters={!parsed.success} />;
}
