import { requireUserRole } from "@/lib/accounts";
import { listAccountQuotes } from "@/lib/quotes";
import { CommerceList } from "../../components/CommerceList";
export const dynamic = "force-dynamic";
export default async function CustomerQuotesPage(){const p=await requireUserRole("couple");const quotes=await listAccountQuotes(p.clerkUserId,"couple");return <CommerceList role="couple" kind="quotes" quotes={quotes}/>;}