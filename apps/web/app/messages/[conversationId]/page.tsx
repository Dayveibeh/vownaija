import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getUserProfile } from "@/lib/accounts";
import { getConversationDetail } from "@/lib/messaging";
import ConversationClient from "./conversation-client";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/couples/sign-up?mode=signin");

  const profile = await getUserProfile(userId);
  if (!profile) redirect("/account/setup");

  const { conversationId } = await params;
  const conversation = await getConversationDetail(conversationId, userId, profile.role);
  if (!conversation) notFound();

  return <ConversationClient initialConversation={conversation} role={profile.role} />;
}
