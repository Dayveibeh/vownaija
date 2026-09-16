import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabaseSchema, getDb } from "@/db";
import { customerProfiles } from "@/db/schema";

const preferenceSchema = z.object({
  weddingDate: z.string().regex(/^\d{4}-\d{2}$/).optional().or(z.literal("")),
  weddingLocation: z.string().trim().min(2).max(120),
  weddingType: z.string().trim().min(2).max(120),
  guestCount: z.string().trim().min(1).max(80),
  budgetBand: z.string().trim().min(1).max(80),
  weddingStyle: z.string().trim().min(1).max(80),
  requiredServices: z.array(z.string().trim().min(1).max(120)).max(20),
});

const stateByCity: Record<string, string> = {
  Lagos: "Lagos",
  Abuja: "FCT",
  "Port Harcourt": "Rivers",
  Ibadan: "Oyo",
  "Benin City": "Edo",
  Enugu: "Enugu",
};

function ceilingForBand(band: string) {
  if (band === "Under ₦1m") return "999999";
  if (band === "₦1m–₦3m") return "3000000";
  if (band === "₦3m–₦7m") return "7000000";
  if (band === "₦7m+") return "50000000";
  return null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const [profile] = await getDb().select().from(customerProfiles)
      .where(eq(customerProfiles.clerkUserId, userId))
      .limit(1);

    return NextResponse.json({ currency: "NGN", profile: profile ?? null });
  } catch (error) {
    console.error("Failed to load customer preferences", error);
    return NextResponse.json({ message: "Unable to load your wedding preferences right now." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const parsed = preferenceSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ message: "Please check your wedding details.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const values = parsed.data;
  const weddingDate = values.weddingDate ? `${values.weddingDate}-01` : null;

  try {
    await ensureDatabaseSchema();
    const [profile] = await getDb().insert(customerProfiles).values({
      clerkUserId: userId,
      weddingDate,
      weddingLocation: values.weddingLocation,
      weddingState: stateByCity[values.weddingLocation] ?? null,
      weddingType: values.weddingType,
      guestCount: values.guestCount,
      budgetBand: values.budgetBand,
      budgetCeiling: ceilingForBand(values.budgetBand),
      currencyCode: "NGN",
      weddingStyle: values.weddingStyle,
      requiredServices: values.requiredServices,
      onboardingComplete: true,
    }).onConflictDoUpdate({
      target: customerProfiles.clerkUserId,
      set: {
        weddingDate,
        weddingLocation: values.weddingLocation,
        weddingState: stateByCity[values.weddingLocation] ?? null,
        weddingType: values.weddingType,
        guestCount: values.guestCount,
        budgetBand: values.budgetBand,
        budgetCeiling: ceilingForBand(values.budgetBand),
        currencyCode: "NGN",
        weddingStyle: values.weddingStyle,
        requiredServices: values.requiredServices,
        onboardingComplete: true,
        updatedAt: new Date(),
      },
    }).returning();

    return NextResponse.json({ ok: true, currency: "NGN", profile });
  } catch (error) {
    console.error("Failed to save customer preferences", error);
    return NextResponse.json({ message: "Unable to save your wedding preferences right now." }, { status: 500 });
  }
}
