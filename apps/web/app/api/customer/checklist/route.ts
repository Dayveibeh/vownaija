import { customerApiIdentity, planningError } from "@/lib/customer-api-auth";
import { rejectCrossOriginWrite } from "@/lib/vendor-api-auth";
import { checklistItemSchema, itemDeleteSchema, checklistPatchSchema } from "@/lib/customer-validation";
import { saveChecklistItem, deleteChecklistItem, completeChecklistItem } from "@/lib/customer-workspace";

export async function POST(request: Request) {
  const identity = await customerApiIdentity();
  if (identity instanceof Response) return identity;
  const rejected = rejectCrossOriginWrite(request); if (rejected) return rejected;
  const input = await request.json().catch(() => null);
  const parsed = checklistItemSchema.safeParse(input);
  if (!parsed.success) return Response.json({ message: "Please check your item.", issues: parsed.error.flatten() }, { status: 400 });
  try { return Response.json({ ok: true, item: await saveChecklistItem(identity, parsed.data) }); }
  catch (error) { return planningError(error); }
}
export async function DELETE(request: Request) {
  const identity = await customerApiIdentity();
  if (identity instanceof Response) return identity;
  const rejected = rejectCrossOriginWrite(request); if (rejected) return rejected;
  const parsed = itemDeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Choose an item." }, { status: 400 });
  try { await deleteChecklistItem(identity, parsed.data.id); return Response.json({ ok: true }); }
  catch (error) { return planningError(error); }
}

export async function PATCH(request: Request) {
  const identity = await customerApiIdentity();
  if (identity instanceof Response) return identity;
  const rejected = rejectCrossOriginWrite(request); if (rejected) return rejected;
  const parsed = checklistPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Choose a task and its completion status." }, { status: 400 });
  try { return Response.json({ ok: true, item: await completeChecklistItem(identity, parsed.data.id, parsed.data.completed) }); }
  catch (error) { return planningError(error); }
}
