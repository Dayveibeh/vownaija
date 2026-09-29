import { notFound } from "next/navigation";
import type { MarketplaceVendorDetailRecord } from "@smitten/shared";
import { getMarketplaceVendor } from "@/lib/marketplace";
import VendorProfileClient from "./vendor-profile-client";

export default async function VendorProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ vendorId: string }>;
  searchParams: Promise<{ enquire?: string; package?: string }>;
}) {
  const { vendorId } = await params;
  const query = await searchParams;
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
    acceptingEnquiries: Boolean(record.ownerClerkUserId),
    about: record.about,
    travelDistance: record.travelDistance,
    gallery: Array.isArray(record.gallery) ? record.gallery : [record.imageUrl],
    highlights: Array.isArray(record.highlights) ? record.highlights : [],
    instagram: record.instagram,
    responseTime: record.responseTime,
    availability: record.availability,
    packages: record.packages,
  };

  const requestedPackageId = query.package && vendor.packages.some((item) => item.id === query.package)
    ? query.package
    : null;

  return (
    <VendorProfileClient
      vendor={vendor}
      autoOpenEnquiry={query.enquire === "1"}
      initialPackageId={requestedPackageId}
    />
  );
}
