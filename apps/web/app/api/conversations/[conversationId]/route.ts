import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/accounts";
import { getConversationDetail } from "@/lib/messaging";

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
