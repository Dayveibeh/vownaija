import { accountAccessResponse } from "@/lib/account-access";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/accounts";
import { adminApiIdentity } from "@/lib/admin-api-auth";
import { getPaymentReceiptData } from "@/lib/payments";
import { buildPaymentReceiptPdf } from "@/lib/payment-receipt-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  const profile = await getUserProfile(userId);
  const restricted = accountAccessResponse(profile); if (restricted) return restricted;
  if (!profile) return NextResponse.json({ message: "Account setup required." }, { status: 409 });
  if (profile.role === "admin") {
    const admin = await adminApiIdentity();
    if (admin instanceof Response) return admin;
  }

  const { paymentId } = await params;
  const receipt = await getPaymentReceiptData(paymentId, userId, profile.role);
  if (!receipt) return NextResponse.json({ message: "Receipt not found." }, { status: 404 });

  const pdf = buildPaymentReceiptPdf(receipt);
  const purpose = receipt.purpose === "deposit" ? "Deposit" : receipt.purpose === "balance" ? "Balance" : "Payment";
  const safeRef = receipt.providerReference.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 36);

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Smitten-${purpose}-Receipt-${safeRef || receipt.paymentId.slice(0,8)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
