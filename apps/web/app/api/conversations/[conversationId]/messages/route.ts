import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/accounts";
import { getConversationDetail, sendConversationMessage } from "@/lib/messaging";

const schema = z.object({ body: z.string().trim().min(1).max(3000) });

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile) return NextResponse.json({ message: "Account setup required." }, { status: 409 });
  const { conversationId } = await params;
  const conversation = await getConversationDetail(conversationId, userId, profile.role);
  if (!conversation) return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
  return NextResponse.json({ conversation, role: profile.role });
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile) return NextResponse.json({ message: "Account setup required." }, { status: 409 });

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid request." }, { status: 400 }); }

  const parsed = schema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ message: "Write a message before sending." }, { status: 400 });

  const { conversationId } = await params;
  try {
    const result = await sendConversationMessage(conversationId, userId, parsed.data.body);
    return NextResponse.json({ ok: true, message: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CONVERSATION_NOT_FOUND") {
      return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
    }
    console.error("Failed to send message", error);
    return NextResponse.json({ message: "We couldn’t send your message just now." }, { status: 500 });
  }
}
