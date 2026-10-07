import { getSql } from "@/db";
import type { CustomerPlanning, BudgetItem, ChecklistItem } from "./customer-validation";

export async function getCustomerPlanning(userId: string): Promise<CustomerPlanning> {
  const sql = getSql();
  const [profiles, budget, checklist] = await Promise.all([
    sql`SELECT * FROM customer_profiles WHERE clerk_user_id=${userId} LIMIT 1`,
    sql`SELECT id,title,amount FROM customer_budget_items WHERE clerk_user_id=${userId} ORDER BY created_at,id`,
    sql`SELECT id,title,due_date,completed FROM customer_checklist_items WHERE clerk_user_id=${userId} ORDER BY created_at,id`,
  ]);
  const p = profiles[0];
  return {
    details: {
      weddingDate: p?.wedding_date ? String(p.wedding_date).slice(0, 10) : "",
      weddingLocation: String(p?.wedding_location || ""), weddingState: String(p?.wedding_state || ""),
      weddingType: String(p?.wedding_type || "Traditional & white wedding"), guestCount: String(p?.guest_count || ""),
      budgetBand: String(p?.budget_band || "Not set"), budgetCeiling: String(p?.budget_ceiling || "0"),
      weddingStyle: String(p?.wedding_style || "Modern"), requiredServices: (p?.required_services || []) as string[],
    },
    budget: budget.map((b) => ({ id: String(b.id), title: String(b.title), amount: String(b.amount) })),
    checklist: checklist.map((c) => ({ id: String(c.id), title: String(c.title), dueDate: c.due_date ? String(c.due_date).slice(0, 10) : null, completed: Boolean(c.completed) })),
  };
}

export async function saveBudgetItem(userId: string, item: { id?: string; title: string; amount: string }) {
  const sql = getSql();
  const rows = item.id
    ? await sql`UPDATE customer_budget_items SET title=${item.title},amount=${item.amount},updated_at=now() WHERE id=${item.id} AND clerk_user_id=${userId} RETURNING id,title,amount`
    : await sql`INSERT INTO customer_budget_items(id,clerk_user_id,title,amount) VALUES(${crypto.randomUUID()},${userId},${item.title},${item.amount}) RETURNING id,title,amount`;
  if (!rows[0]) throw new Error("ITEM_NOT_FOUND");
  return rows[0] as BudgetItem;
}
export async function deleteBudgetItem(userId: string, id: string) {
  const rows = await getSql()`DELETE FROM customer_budget_items WHERE id=${id} AND clerk_user_id=${userId} RETURNING id`;
  if (!rows[0]) throw new Error("ITEM_NOT_FOUND");
}
export async function saveChecklistItem(userId: string, item: { id?: string; title: string; dueDate?: string; completed: boolean }) {
  const sql = getSql();
  const rows = item.id
    ? await sql`UPDATE customer_checklist_items SET title=${item.title},due_date=${item.dueDate || null},completed=${item.completed},updated_at=now() WHERE id=${item.id} AND clerk_user_id=${userId} RETURNING id,title,due_date,completed`
    : await sql`INSERT INTO customer_checklist_items(id,clerk_user_id,title,due_date,completed) VALUES(${crypto.randomUUID()},${userId},${item.title},${item.dueDate || null},${item.completed}) RETURNING id,title,due_date,completed`;
  return mapChecklist(rows[0]);
}
function mapChecklist(row: Record<string, unknown> | undefined): ChecklistItem {
  if (!row) throw new Error("ITEM_NOT_FOUND");
  return { id: String(row.id), title: String(row.title), dueDate: row.due_date ? String(row.due_date).slice(0, 10) : null, completed: Boolean(row.completed) };
}
export async function completeChecklistItem(userId: string, id: string, completed: boolean) {
  const rows = await getSql()`UPDATE customer_checklist_items SET completed=${completed},updated_at=now() WHERE id=${id} AND clerk_user_id=${userId} RETURNING id,title,due_date,completed`;
  return mapChecklist(rows[0]);
}
export async function deleteChecklistItem(userId: string, id: string) {
  const rows = await getSql()`DELETE FROM customer_checklist_items WHERE id=${id} AND clerk_user_id=${userId} RETURNING id`;
  if (!rows[0]) throw new Error("ITEM_NOT_FOUND");
}
