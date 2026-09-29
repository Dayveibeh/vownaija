import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getUserProfile } from "@/lib/accounts";
import { getQuoteForAccount } from "@/lib/quotes";
import QuoteDetailClient from "./quote-detail-client";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/couples/sign-up?mode=signin");

  const profile = await getUserProfile(userId);
  if (!profile) redirect("/account/setup");

  const { quoteId } = await params;
  const quote = await getQuoteForAccount(quoteId, userId, profile.role);
  if (!quote) notFound();

  return <QuoteDetailClient quote={quote} role={profile.role} />;
}
