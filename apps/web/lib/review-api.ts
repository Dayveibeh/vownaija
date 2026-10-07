export function reviewError(error: unknown) {
  if (error instanceof Error && error.message === "ITEM_NOT_FOUND") return Response.json({ message: "That item was not found in your account." }, { status: 404 });
  if (error instanceof Error && error.message === "BOOKING_NOT_READY") return Response.json({ message: "Confirm delivery after the booking date before leaving a review. Cancelled bookings cannot be reviewed." }, { status: 409 });
  if (error instanceof Error && error.message === "REVIEW_CHANGED") return Response.json({ message: "This review changed. Refresh the page and read the latest version before moderating it." }, { status: 409 });
  console.error("Review or moderation failed", error);
  return Response.json({ message: "We couldn’t save this change. Please try again." }, { status: 500 });
}
