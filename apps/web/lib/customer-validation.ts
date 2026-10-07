import { z } from "zod";
import { nairaInput, nigeriaStates } from "./vendor-validation";

export const weddingDateInput = z.string().refine((value) => {
  if (value === "") return true;
  if (!/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) return false;
  if (Number(value.slice(0, 4)) < 1) return false;
  const date = value.length === 7 ? `${value}-01` : value;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}, "Choose a valid date.");

export const preferenceSchema = z.object({
  weddingDate: weddingDateInput.optional(),
  weddingLocation: z.string().trim().min(2).max(120),
  weddingState: z.string().refine((v) => v === "" || nigeriaStates.includes(v), "Choose a state.").optional(),
  weddingType: z.string().trim().min(2).max(120),
  guestCount: z.string().trim().min(1).max(80),
  budgetBand: z.string().trim().min(1).max(80),
  budgetCeiling: nairaInput.optional(),
  weddingStyle: z.string().trim().min(1).max(80),
  requiredServices: z.array(z.string().trim().min(1).max(120)).max(20),
}).strict();
export const preferencePatchSchema = preferenceSchema.partial().refine(
  (value) => Object.keys(value).length > 0, "At least one preference is required.",
);
export const budgetItemSchema = z.object({
  id: z.string().uuid().optional(), title: z.string().trim().min(2).max(120), amount: nairaInput,
}).strict();
export const checklistItemSchema = z.object({
  id: z.string().uuid().optional(), title: z.string().trim().min(2).max(160),
  dueDate: weddingDateInput.refine((v) => !v || v.length === 10, "Choose a full date.").optional(),
  completed: z.boolean().default(false),
}).strict();
export const checklistPatchSchema = z.object({ id: z.string().uuid(), completed: z.boolean() }).strict();
export const itemDeleteSchema = z.object({ id: z.string().uuid() }).strict();

export type WeddingDetailsForm = z.input<typeof preferenceSchema>;
export type BudgetItem = { id: string; title: string; amount: string };
export type ChecklistItem = { id: string; title: string; dueDate: string | null; completed: boolean };
export type CustomerPlanning = {
  details: WeddingDetailsForm; budget: BudgetItem[]; checklist: ChecklistItem[];
};
