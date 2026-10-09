import { adminApiIdentity } from "@/lib/admin-api-auth";
import { rejectCrossOriginWrite } from "@/lib/vendor-api-auth";
import { listAdminUsers, administerUser, userActionInput, userFilters } from "@/lib/admin-workspace";
export async function GET(request: Request) {
  const actor = await adminApiIdentity(); if (actor instanceof Response) return actor;
  const filters = userFilters.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!filters.success) return Response.json({ message: "Choose valid user filters." }, { status: 400 });
  return Response.json(await listAdminUsers(filters.data), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  const actor = await adminApiIdentity(); if (actor instanceof Response) return actor;
  const rejected = rejectCrossOriginWrite(request); if (rejected) return rejected;
  const input = userActionInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ message: "Choose a user, action and reason of 5–500 characters." }, { status: 400 });
  try { await administerUser(actor, input.data); return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    const messages: Record<string,string> = { ADMIN_PROTECTED: "Admin accounts cannot be changed through this control.", ITEM_NOT_FOUND: "User not found.", CONFIRMATION_REQUIRED: "Type the user’s email address to confirm removal.", USER_CHANGED: "This account changed. Refresh the list before trying again." };
    const code = error instanceof Error ? error.message : "";
    return Response.json({ message: messages[code] || "We couldn’t save this user action." }, { status: code === "ITEM_NOT_FOUND" ? 404 : messages[code] ? 409 : 500 });
  }
}
