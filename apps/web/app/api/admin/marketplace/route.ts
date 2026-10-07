import { adminApiIdentity } from "@/lib/admin-api-auth";
import { rejectCrossOriginWrite } from "@/lib/vendor-api-auth";
import { getAdminMarketplace, moderateMarketplace, moderationInput } from "@/lib/reviews";
import { reviewError } from "@/lib/review-api";
export async function GET() {
  const actor = await adminApiIdentity(); if (actor instanceof Response) return actor;
  try { return Response.json({ marketplace: await getAdminMarketplace() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return reviewError(error); }
}
export async function POST(request: Request) {
  const actor = await adminApiIdentity(); if (actor instanceof Response) return actor;
  const rejected = rejectCrossOriginWrite(request); if (rejected) return rejected;
  const parsed = moderationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Choose a valid item, action and reason of 5–500 characters." }, { status: 400 });
  try { await moderateMarketplace(actor, parsed.data); return Response.json({ marketplace: await getAdminMarketplace() }); }
  catch (error) { return reviewError(error); }
}
