import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/accounts";
import { createEnquiry, listConversationSummaries } from "@/lib/messaging";

const schema = z.object({
  vendorId: z.string().trim().min(1),
  packageId: z.string().trim().min(1).nullable().optional(),
  requestedService: z.string().trim().max(160).nullable().optional(),
  weddingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  weddingLocation: z.string().trim().min(2).max(160),
  guestCount: z.string().trim().max(80).nullable().optional(),
  budgetBand: z.string().trim().max(80).nullable().optional(),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(3000),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in to send an enquiry." }, { status: 401 });

  const profile = await getUserProfile(userId);
  if (!profile || profile.role !== "couple") {
    return NextResponse.json({ message: "A couple account is required to contact vendors." }, { status: 403 });
  }

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid request." }, { status: 400 }); }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ message: "Please check your enquiry details.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await createEnquiry(userId, parsed.data);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "VENDOR_NOT_FOUND") {
      return NextResponse.json({ message: "That vendor is no longer available." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "PACKAGE_NOT_FOUND") {
      return NextResponse.json({ message: "That package is no longer available." }, { status: 400 });
    }
    console.error("Failed to create enquiry", error);
    return NextResponse.json({ message: "We couldn’t send your enquiry just now." }, { status: 500 });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile) return NextResponse.json({ message: "Account setup required." }, { status: 409 });

  const conversations = await listConversationSummaries(userId, profile.role);
  return NextResponse.json({ conversations });
}
