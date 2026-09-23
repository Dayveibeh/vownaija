import { requireUserRole } from "@/lib/accounts";
import { listAccountBookings } from "@/lib/quotes";
import { CommerceList } from "../../components/CommerceList";
export const dynamic = "force-dynamic";
export default async function CustomerBookingsPage(){const p=await requireUserRole("couple");const bookings=await listAccountBookings(p.clerkUserId,"couple");return <CommerceList role="couple" kind="bookings" bookings={bookings}/>;}