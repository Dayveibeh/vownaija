import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/accounts";
import { listPaystackBanks } from "@/lib/payments";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile || (profile.role !== "vendor" && profile.role !== "admin")) {
    return NextResponse.json({ message: "Vendor account required." }, { status: 403 });
  }

  try {
    const banks = await listPaystackBanks();
    return NextResponse.json({ banks });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYSTACK_NOT_CONFIGURED") {
      return NextResponse.json({ banks: [], configured: false });
    }
    console.error("Failed to load Paystack banks", error);
    return NextResponse.json({ message: "We couldn’t load Nigerian banks just now." }, { status: 500 });
  }
}
