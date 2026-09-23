import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getUserProfile } from "@/lib/accounts";
import { getBookingForAccount, getQuoteForAccount } from "@/lib/quotes";
import BookingDetailClient from "./booking-detail-client";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/couples/sign-up?mode=signin");

  const profile = await getUserProfile(userId);
  if (!profile) redirect("/account/setup");

  const { bookingId } = await params;
  const booking = await getBookingForAccount(bookingId, userId, profile.role);
  if (!booking) notFound();

  const quote = await getQuoteForAccount(booking.quoteId, userId, profile.role);
  if (!quote) notFound();

  return <BookingDetailClient booking={booking} quote={quote} role={profile.role} />;
}
