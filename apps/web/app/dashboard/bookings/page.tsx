import { requireUserRole } from "@/lib/accounts";
import { listAccountBookings } from "@/lib/quotes";
import { CommerceList } from "../../components/CommerceList";
export const dynamic = "force-dynamic";
export default async function VendorBookingsPage(){const p=await requireUserRole("vendor");const bookings=await listAccountBookings(p.clerkUserId,"vendor");return <CommerceList role="vendor" kind="bookings" bookings={bookings}/>;}