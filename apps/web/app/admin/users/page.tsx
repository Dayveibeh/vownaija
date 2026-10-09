import { requireUserRole } from "@/lib/accounts";
import { listAdminUsers, userFilters } from "@/lib/admin-workspace";
import AdminUsersClient from "./users-client";
export const dynamic = "force-dynamic";
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string,string | string[] | undefined>> }) {
  await requireUserRole("admin");
  const parsed = userFilters.safeParse(await searchParams);
  const filters = parsed.success ? parsed.data : userFilters.parse({});
  return <AdminUsersClient key={JSON.stringify(filters)} filters={filters} initial={await listAdminUsers(filters)} invalidFilters={!parsed.success} />;
}
