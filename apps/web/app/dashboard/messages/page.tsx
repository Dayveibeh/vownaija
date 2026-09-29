import { requireUserRole } from "@/lib/accounts";
import { listConversationSummaries } from "@/lib/messaging";
import { ConversationList } from "../../components/ConversationList";

export const dynamic = "force-dynamic";

export default async function VendorMessagesPage() {
  const profile = await requireUserRole("vendor");
  const conversations = await listConversationSummaries(profile.clerkUserId, "vendor");
  return <ConversationList conversations={conversations} role="vendor" />;
}
