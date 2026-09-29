import { requireUserRole } from "@/lib/accounts";
import { listConversationSummaries } from "@/lib/messaging";
import { ConversationList } from "../../components/ConversationList";

export const dynamic = "force-dynamic";

export default async function CustomerMessagesPage() {
  const profile = await requireUserRole("couple");
  const conversations = await listConversationSummaries(profile.clerkUserId, "couple");
  return <ConversationList conversations={conversations} role="couple" />;
}
