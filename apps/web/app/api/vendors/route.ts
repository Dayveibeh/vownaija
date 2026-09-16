import { NextRequest, NextResponse } from "next/server";
import { listMarketplaceVendors } from "@/lib/marketplace";

function numberParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  try {
    const vendors = await listMarketplaceVendors({
      category: params.get("category")?.trim() || undefined,
      location: params.get("location")?.trim() || undefined,
      minPrice: numberParam(params.get("minPrice")),
      maxPrice: numberParam(params.get("maxPrice")),
      query: params.get("q")?.trim() || undefined,
    });

    return NextResponse.json({
      market: "NG",
      currency: "NGN",
      count: vendors.length,
      vendors,
    });
  } catch (error) {
    console.error("Failed to load marketplace vendors", error);
    return NextResponse.json({ message: "Unable to load vendors right now." }, { status: 500 });
  }
}
