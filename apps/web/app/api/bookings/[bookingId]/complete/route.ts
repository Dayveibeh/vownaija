import { z } from "zod";
import { customerApiIdentity } from "@/lib/customer-api-auth";
import { rejectCrossOriginWrite } from "@/lib/vendor-api-auth";
import { completeCustomerBooking } from "@/lib/reviews";
import { reviewError } from "@/lib/review-api";
export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const actor = await customerApiIdentity(); if (actor instanceof Response) return actor;
  const rejected = rejectCrossOriginWrite(request); if (rejected) return rejected;
  if (!z.object({ serviceDelivered: z.literal(true) }).strict().safeParse(await request.json().catch(() => null)).success) return Response.json({ message: "Confirm that the booked service was delivered." }, { status: 400 });
  try { return Response.json({ state: await completeCustomerBooking((await params).bookingId, actor) }); }
  catch (error) { return reviewError(error); }
}
