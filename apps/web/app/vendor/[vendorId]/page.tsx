import { notFound } from "next/navigation";
import type { MarketplaceVendorDetailRecord } from "@smitten/shared";
import { getMarketplaceVendor } from "@/lib/marketplace";
import VendorProfileClient from "./vendor-profile-client";

export default async function VendorProfilePage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;
  const record = await getMarketplaceVendor(vendorId);
  if (!record) notFound();

  const vendor: MarketplaceVendorDetailRecord = {
    id: record.id,
    businessName: record.businessName,
    category: record.category,
    location: record.location,
    state: record.state ?? "",
    startingPrice: Number(record.startingPrice),
    currencyCode: record.currencyCode,
    tier: record.tier as MarketplaceVendorDetailRecord["tier"],
    rating: Number(record.rating),
    reviewCount: record.reviewCount,
    imageUrl: record.imageUrl,
    styles: Array.isArray(record.styles) ? record.styles : [],
    matchReason: record.matchReason,
    active: record.active,
    about: record.about,
    travelDistance: record.travelDistance,
    gallery: Array.isArray(record.gallery) ? record.gallery : [record.imageUrl],
    highlights: Array.isArray(record.highlights) ? record.highlights : [],
    instagram: record.instagram,
    responseTime: record.responseTime,
    availability: record.availability,
    packages: record.packages,
  };

  return <VendorProfileClient vendor={vendor} />;
}
