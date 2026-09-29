import { requireUserRole } from "@/lib/accounts";
import { listAccountQuotes } from "@/lib/quotes";
import { CommerceList } from "../../components/CommerceList";
export const dynamic = "force-dynamic";
export default async function VendorQuotesPage(){const p=await requireUserRole("vendor");const quotes=await listAccountQuotes(p.clerkUserId,"vendor");return <CommerceList role="vendor" kind="quotes" quotes={quotes}/>;}