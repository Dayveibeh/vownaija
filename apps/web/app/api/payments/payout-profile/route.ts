import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/accounts";
import { configureVendorPayoutProfile, getVendorPayoutProfile } from "@/lib/payments";

const schema = z.object({
  bankCode: z.string().trim().min(2).max(16),
  bankName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().regex(/^\d{10}$/),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile || (profile.role !== "vendor" && profile.role !== "admin")) {
    return NextResponse.json({ message: "Vendor account required." }, { status: 403 });
  }
  const payoutProfile = await getVendorPayoutProfile(userId);
  return NextResponse.json({ payoutProfile });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile || (profile.role !== "vendor" && profile.role !== "admin")) {
    return NextResponse.json({ message: "Vendor account required." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid request." }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Enter a valid Nigerian bank account." }, { status: 400 });

  try {
    const payoutProfile = await configureVendorPayoutProfile(userId, parsed.data);
    return NextResponse.json({ ok: true, payoutProfile });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PAYSTACK_NOT_CONFIGURED") return NextResponse.json({ message: "Paystack test keys are not configured on this deployment yet." }, { status: 503 });
    if (code === "INVALID_ACCOUNT_NUMBER") return NextResponse.json({ message: "Enter a valid 10-digit account number." }, { status: 400 });
    if (code === "ACCOUNT_RESOLUTION_FAILED") return NextResponse.json({ message: "Paystack could not verify that account number with the selected bank." }, { status: 400 });
    console.error("Failed to configure vendor payout profile", error);
    return NextResponse.json({ message: "We couldn’t save this payout account just now." }, { status: 500 });
  }
}
