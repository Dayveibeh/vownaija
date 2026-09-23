import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/accounts";
import { getQuoteForAccount } from "@/lib/quotes";
import { buildQuotePdf } from "@/lib/quote-pdf";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const profile = await getUserProfile(userId);
  if (!profile) return NextResponse.json({ message: "Account setup required." }, { status: 409 });

  const { quoteId } = await params;
  const quote = await getQuoteForAccount(quoteId, userId, profile.role);
  if (!quote) return NextResponse.json({ message: "Quote not found." }, { status: 404 });

  const pdf = buildQuotePdf(quote);
  const safeName = quote.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 48) || "Wedding-Quote";

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Smitten-${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
