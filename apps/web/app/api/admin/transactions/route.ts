import { adminApiIdentity } from "@/lib/admin-api-auth";
import { listAdminTransactions, transactionFilters } from "@/lib/admin-workspace";
export async function GET(request: Request) {
  const actor = await adminApiIdentity(); if (actor instanceof Response) return actor;
  const filters = transactionFilters.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!filters.success) return Response.json({ message: "Choose valid transaction filters and dates." }, { status: 400 });
  return Response.json(await listAdminTransactions(filters.data), { headers: { "Cache-Control": "no-store" } });
}
