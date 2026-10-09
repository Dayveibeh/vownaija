import { restrictedMessage } from "@/lib/account-access";
import { NextResponse } from "next/server";
import { syncCurrentUserProfile } from "@/lib/accounts";

export async function POST() {
  try {
    const profile = await syncCurrentUserProfile("couple");
    return NextResponse.json({
      ok: true,
      market: "NG",
      currency: "NGN",
      profile,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_RESTRICTED") return NextResponse.json({ message: restrictedMessage, code: "ACCOUNT_RESTRICTED" }, { status: 403 });
    console.error("Failed to bootstrap Smitten account", error);
    return NextResponse.json({ message: "Unable to prepare your Smitten account right now." }, { status: 500 });
  }
}
