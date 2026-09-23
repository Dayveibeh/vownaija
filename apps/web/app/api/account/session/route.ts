import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserProfile, syncCurrentUserProfile } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ signedIn: false }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const profile = (await getUserProfile(userId)) ?? await syncCurrentUserProfile("couple");
    return NextResponse.json({
      signedIn: true,
      profile: {
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role,
      },
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to resolve active Smitten session", error);
    return NextResponse.json({ signedIn: true, profile: null }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
