import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/accounts";
import { createConversationQuote, loadConversationQuotes } from "@/lib/quotes";

const itemSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(600).nullable().optional(),
  quantity: z.number().int().min(1).max(100),
  unitPrice: z.number().min(0).max(1000000000),
});

const quoteSchema = z.object({
  title: z.string().trim().min(2).max(160),
  notes: z.string().trim().max(2000).nullable().optional(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  discountAmount: z.number().min(0).max(1000000000).optional(),
  additionalFees: z.number().min(0).max(1000000000).optional(),
  items: z.array(itemSchema).min(1).max(20),
});

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile) return NextResponse.json({ message: "Account setup required." }, { status: 409 });
  const { conversationId } = await params;
  try {
    const quotes = await loadConversationQuotes(conversationId, userId, profile.role);
    return NextResponse.json({ quotes, role: profile.role });
  } catch {
    return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile || (profile.role !== "vendor" && profile.role !== "admin")) {
    return NextResponse.json({ message: "Only the vendor can create a quote." }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Invalid request." }, { status: 400 }); }
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Please check the quote details.", issues: parsed.error.flatten() }, { status: 400 });

  const { conversationId } = await params;
  try {
    const quote = await createConversationQuote(conversationId, userId, parsed.data);
    return NextResponse.json({ ok: true, quote }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CONVERSATION_BOOKED") return NextResponse.json({ message: "This enquiry already has a confirmed booking." }, { status: 409 });
    if (code === "INVALID_TOTAL") return NextResponse.json({ message: "The quote total must be greater than zero." }, { status: 400 });
    if (code === "CONVERSATION_NOT_FOUND") return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
    console.error("Failed to create quote", error);
    return NextResponse.json({ message: "We couldn’t send the quote just now." }, { status: 500 });
  }
}
