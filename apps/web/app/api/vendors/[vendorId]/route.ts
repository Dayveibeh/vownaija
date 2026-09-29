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

    return NextResponse.json({
      market: "NG",
      currency: "NGN",
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        category: vendor.category,
        location: vendor.location,
        state: vendor.state ?? "",
        startingPrice: vendor.startingPrice,
        currencyCode: vendor.currencyCode,
        tier: vendor.tier,
        rating: vendor.rating,
        reviewCount: vendor.reviewCount,
        imageUrl: vendor.imageUrl,
        styles: Array.isArray(vendor.styles) ? vendor.styles : [],
        matchReason: vendor.matchReason,
        active: vendor.active,
        acceptingEnquiries: Boolean(vendor.ownerClerkUserId),
        about: vendor.about,
        travelDistance: vendor.travelDistance,
        gallery: Array.isArray(vendor.gallery) ? vendor.gallery : [vendor.imageUrl],
        highlights: Array.isArray(vendor.highlights) ? vendor.highlights : [],
        instagram: vendor.instagram,
        responseTime: vendor.responseTime,
        availability: vendor.availability,
        packages: vendor.packages,
      },
    });
  } catch (error) {
    console.error("Failed to load marketplace vendor", error);
    return NextResponse.json({ message: "Unable to load this vendor right now." }, { status: 500 });
  }
}
