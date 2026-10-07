import { customerApiIdentity } from "@/lib/customer-api-auth";
import { rejectCrossOriginWrite } from "@/lib/vendor-api-auth";
import { getBookingReviewState, reviewInput, saveBookingReview } from "@/lib/reviews";
import { reviewError } from "@/lib/review-api";
export async function GET(_request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const actor = await customerApiIdentity(); if (actor instanceof Response) return actor;
  try {
    const state = await getBookingReviewState((await params).bookingId, actor);
    return state ? Response.json({ state }, { headers: { "Cache-Control": "no-store" } }) : Response.json({ message: "Booking not found." }, { status: 404 });
  } catch (error) { return reviewError(error); }
}
export async function PUT(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const actor = await customerApiIdentity(); if (actor instanceof Response) return actor;
  const rejected = rejectCrossOriginWrite(request); if (rejected) return rejected;
  const parsed = reviewInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Choose 1–5 stars, a title of 3–120 characters and feedback of 20–2,000 characters." }, { status: 400 });
  try { return Response.json({ review: await saveBookingReview((await params).bookingId, actor, parsed.data) }); }
  catch (error) { return reviewError(error); }
}
