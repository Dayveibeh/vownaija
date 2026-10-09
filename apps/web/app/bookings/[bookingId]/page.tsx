import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { requireActiveUserProfile } from "@/lib/accounts";
import { getBookingForAccount, getQuoteForAccount } from "@/lib/quotes";
import { getBookingPaymentSummary } from "@/lib/payments";
import { getBookingReviewState } from "@/lib/reviews";
import BookingDetailClient from "./booking-detail-client";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/couples/sign-up?mode=signin");

  const profile = await requireActiveUserProfile(userId);
  if (!profile) redirect("/account/setup");

  const { bookingId } = await params;
  const booking = await getBookingForAccount(bookingId, userId, profile.role);
  if (!booking) notFound();

  const [quote, paymentSummary, reviewState] = await Promise.all([
    getQuoteForAccount(booking.quoteId, userId, profile.role),
    getBookingPaymentSummary(booking.id, userId, profile.role),
    profile.role === "couple" ? getBookingReviewState(booking.id, userId) : Promise.resolve(null),
  ]);
  if (!quote || !paymentSummary) notFound();

  return <BookingDetailClient reviewState={reviewState} booking={booking} quote={quote} role={profile.role} paymentSummary={paymentSummary} />;
}
