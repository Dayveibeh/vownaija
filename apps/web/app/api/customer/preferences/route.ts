import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { customerProfiles } from "@/db/schema";
import { customerApiIdentity } from "@/lib/customer-api-auth";
import { rejectCrossOriginWrite } from "@/lib/vendor-api-auth";
import { preferenceSchema, preferencePatchSchema } from "@/lib/customer-validation";

const stateByCity: Record<string, string> = { Lagos: "Lagos", Abuja: "FCT", "Port Harcourt": "Rivers", Ibadan: "Oyo", "Benin City": "Edo", Enugu: "Enugu" };
const bandCeilings: Record<string, string> = { "Under ₦1m": "999999", "₦1m–₦3m": "3000000", "₦3m–₦7m": "7000000", "₦7m+": "50000000" };

export async function GET() {
  const identity = await customerApiIdentity();
  if (identity instanceof Response) return identity;
  try {
    const [profile] = await getDb().select().from(customerProfiles).where(eq(customerProfiles.clerkUserId, identity)).limit(1);
    return Response.json({ currency: "NGN", profile: profile ? { ...profile, weddingDate: profile.weddingDate?.slice(0, 10) ?? null } : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to load customer preferences", error);
    return Response.json({ message: "Unable to load your wedding details." }, { status: 500 });
  }
}
async function save(request: Request, partial: boolean) {
  const identity = await customerApiIdentity();
  if (identity instanceof Response) return identity;
  const rejected = rejectCrossOriginWrite(request); if (rejected) return rejected;
  const parsed = (partial ? preferencePatchSchema : preferenceSchema).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Please check your wedding details.", issues: parsed.error.flatten() }, { status: 400 });
  const values = parsed.data;
  const updates: Partial<typeof customerProfiles.$inferInsert> = { ...values, updatedAt: new Date(), currencyCode: "NGN" };
  if (values.weddingDate !== undefined) updates.weddingDate = values.weddingDate ? (values.weddingDate.length === 7 ? `${values.weddingDate}-01` : values.weddingDate) : null;
  if (values.weddingState !== undefined) updates.weddingState = values.weddingState || null;
  else if (values.weddingLocation !== undefined && stateByCity[values.weddingLocation]) updates.weddingState = stateByCity[values.weddingLocation];
  // Matching saves a band, while the planning editor saves an exact budget.
  // Once an exact amount exists, a later matching visit must not overwrite it.
  if (values.budgetCeiling === undefined) delete updates.budgetCeiling;
  if (!partial) updates.onboardingComplete = true;
  try {
    const [profile] = await getDb().insert(customerProfiles).values({
      ...updates, clerkUserId: identity,
      budgetCeiling: values.budgetCeiling ?? (values.budgetBand ? bandCeilings[values.budgetBand] : undefined),
    }).onConflictDoUpdate({ target: customerProfiles.clerkUserId, set: {
      ...updates,
      budgetCeiling: values.budgetCeiling ?? (values.budgetBand && bandCeilings[values.budgetBand]
        ? sql`COALESCE(${customerProfiles.budgetCeiling}, ${bandCeilings[values.budgetBand]})` : undefined),
    } }).returning();
    return Response.json({ ok: true, currency: "NGN", profile: { ...profile, weddingDate: profile.weddingDate?.slice(0, 10) ?? null } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to save customer preferences", error);
    return Response.json({ message: "Unable to save your wedding details. Please try again." }, { status: 500 });
  }
}
export async function PUT(request: Request) { return save(request, false); }
export async function PATCH(request: Request) { return save(request, true); }
