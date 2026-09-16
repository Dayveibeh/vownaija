import { NextResponse } from "next/server";
import { getMarketplaceVendor } from "@/lib/marketplace";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const { vendorId } = await params;

  try {
    const vendor = await getMarketplaceVendor(vendorId);
    if (!vendor) return NextResponse.json({ message: "Vendor not found." }, { status: 404 });

    return NextResponse.json({ market: "NG", currency: "NGN", vendor });
  } catch (error) {
    console.error("Failed to load marketplace vendor", error);
    return NextResponse.json({ message: "Unable to load this vendor right now." }, { status: 500 });
  }
}
