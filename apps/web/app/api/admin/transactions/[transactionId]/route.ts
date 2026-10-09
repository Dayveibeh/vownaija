import { adminApiIdentity } from "@/lib/admin-api-auth";
import { getAdminTransaction } from "@/lib/admin-workspace";
export async function GET(_request: Request, { params }: { params: Promise<{ transactionId: string }> }) {
  const actor = await adminApiIdentity(); if (actor instanceof Response) return actor;
  const { transactionId } = await params;
  const detail = await getAdminTransaction(transactionId);
  return detail ? Response.json(detail, { headers: { "Cache-Control": "no-store" } }) : Response.json({ message: "Transaction not found." }, { status: 404 });
}
