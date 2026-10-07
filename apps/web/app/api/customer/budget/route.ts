import { customerApiIdentity, planningError } from "@/lib/customer-api-auth";
import { rejectCrossOriginWrite } from "@/lib/vendor-api-auth";
import { budgetItemSchema, itemDeleteSchema } from "@/lib/customer-validation";
import { saveBudgetItem, deleteBudgetItem } from "@/lib/customer-workspace";

export async function POST(request: Request) {
  const identity = await customerApiIdentity();
  if (identity instanceof Response) return identity;
  const rejected = rejectCrossOriginWrite(request); if (rejected) return rejected;
  const input = await request.json().catch(() => null);
  const parsed = budgetItemSchema.safeParse(input);
  if (!parsed.success) return Response.json({ message: "Please check your item.", issues: parsed.error.flatten() }, { status: 400 });
  try { return Response.json({ ok: true, item: await saveBudgetItem(identity, parsed.data) }); }
  catch (error) { return planningError(error); }
}
export async function DELETE(request: Request) {
  const identity = await customerApiIdentity();
  if (identity instanceof Response) return identity;
  const rejected = rejectCrossOriginWrite(request); if (rejected) return rejected;
  const parsed = itemDeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Choose an item." }, { status: 400 });
  try { await deleteBudgetItem(identity, parsed.data.id); return Response.json({ ok: true }); }
  catch (error) { return planningError(error); }
}
