import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/accounts";
import { respondToQuote } from "@/lib/quotes";

const schema = z.object({ action: z.enum(["accept", "decline"]) });

export async function POST(request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile || profile.role !== "couple") return NextResponse.json({ message: "Only the customer can respond to this quote." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Invalid request." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Choose accept or decline." }, { status: 400 });

  const { quoteId } = await params;
  try {
    const result = await respondToQuote(quoteId, userId, parsed.data.action);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "QUOTE_EXPIRED") return NextResponse.json({ message: "This quote has expired. Ask the vendor for a new one." }, { status: 409 });
    if (code === "QUOTE_ALREADY_RESPONDED") return NextResponse.json({ message: "This quote has already been responded to." }, { status: 409 });
    if (code === "CONVERSATION_BOOKED") return NextResponse.json({ message: "This enquiry already has a confirmed booking." }, { status: 409 });
    if (code === "QUOTE_NOT_FOUND") return NextResponse.json({ message: "Quote not found." }, { status: 404 });
    console.error("Failed to respond to quote", error);
    return NextResponse.json({ message: "We couldn’t update the quote just now." }, { status: 500 });
  }
}
