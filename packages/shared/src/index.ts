export const DEFAULT_MARKET = "NG" as const;
export const DEFAULT_CURRENCY = "NGN" as const;
export const DEFAULT_LOCALE = "en-NG" as const;

export function formatNaira(amount: number) {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

export type CoupleVendor = {
  id: string;
  name: string;
  category: string;
  location: string;
  state: string;
  currencyCode: typeof DEFAULT_CURRENCY;
  price: string;
  priceMin: number;
  tier: "Budget-friendly" | "Mid-range" | "Premium" | "Luxury";
  rating: string;
  reviews: number;
  image: string;
  style: string[];
  reason: string;
};

export type MarketplaceVendorRecord = {
  id: string;
  businessName: string;
  category: string;
  location: string;
  state: string;
  startingPrice: string | number;
  currencyCode: string;
  tier: CoupleVendor["tier"];
  rating: string | number;
  reviewCount: number;
  imageUrl: string;
  styles: string[];
  matchReason: string;
  active?: boolean;
  acceptingEnquiries?: boolean;
};

export type MarketplaceVendorListResponse = {
  market: typeof DEFAULT_MARKET;
  currency: typeof DEFAULT_CURRENCY;
  count: number;
  vendors: MarketplaceVendorRecord[];
};

export function coupleVendorFromMarketplaceRecord(record: MarketplaceVendorRecord): CoupleVendor {
  const priceMin = Number(record.startingPrice);
  return {
    id: record.id,
    name: record.businessName,
    category: record.category,
    location: record.location,
    state: record.state,
    currencyCode: DEFAULT_CURRENCY,
    price: `From ${formatNaira(Number.isFinite(priceMin) ? priceMin : 0)}`,
    priceMin: Number.isFinite(priceMin) ? priceMin : 0,
    tier: record.tier,
    rating: Number(record.rating).toFixed(1),
    reviews: record.reviewCount,
    image: record.imageUrl,
    style: Array.isArray(record.styles) ? record.styles : [],
    reason: record.matchReason,
  };
}

export type VendorMatchPreferences = {
  location: string;
  budgetCeiling: number;
  services: string[];
  style: string;
};

export const serviceOptions = ["Planning & décor", "Photography", "Bridal beauty", "Cakes & desserts", "Venues"];
export const styleOptions = ["Modern", "Traditional", "Romantic", "Minimal", "Glamorous"];
export const weddingLocations = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Benin City", "Enugu"];

export const coupleVendors: CoupleVendor[] = [
  {
    id: "the-bridal-chair",
    name: "The Bridal Chair",
    category: "Bridal beauty",
    location: "Abuja",
    state: "FCT",
    currencyCode: DEFAULT_CURRENCY,
    price: "From ₦180,000",
    priceMin: 180000,
    tier: "Budget-friendly",
    rating: "4.8",
    reviews: 54,
    image: "https://i.pinimg.com/originals/33/9b/0f/339b0f6a388202ad731f89715e91e442.jpg",
    style: ["Modern", "Minimal", "Glamorous"],
    reason: "Excellent reviews and one of the strongest value options for bridal beauty.",
  },
  {
    id: "dripples-cakes",
    name: "Dripples Cakes",
    category: "Cakes & desserts",
    location: "Lagos",
    state: "Lagos",
    currencyCode: DEFAULT_CURRENCY,
    price: "From ₦250,000",
    priceMin: 250000,
    tier: "Budget-friendly",
    rating: "4.9",
    reviews: 112,
    image: "https://gallery.dripplescakes.com/assets/images/traditional-marriage-cake-by-dripplescakes-2024-15-1000x1333.webp",
    style: ["Traditional", "Glamorous", "Romantic"],
    reason: "Highly rated traditional designs with flexible options for different guest counts.",
  },
  {
    id: "lagos-lens-co",
    name: "Lagos Lens Co.",
    category: "Photography",
    location: "Lagos",
    state: "Lagos",
    currencyCode: DEFAULT_CURRENCY,
    price: "From ₦450,000",
    priceMin: 450000,
    tier: "Mid-range",
    rating: "4.8",
    reviews: 73,
    image: "https://static.wixstatic.com/media/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg",
    style: ["Modern", "Minimal", "Traditional"],
    reason: "A documentary style, strong value and experience with large Lagos celebrations.",
  },
  {
    id: "aurora-events-ng",
    name: "Aurora Events NG",
    category: "Planning & décor",
    location: "Lagos",
    state: "Lagos",
    currencyCode: DEFAULT_CURRENCY,
    price: "From ₦850,000",
    priceMin: 850000,
    tier: "Mid-range",
    rating: "4.9",
    reviews: 86,
    image: "https://ikejabird.com/wp-content/uploads/2025/10/2022-02-01-1.jpg",
    style: ["Modern", "Traditional", "Romantic", "Glamorous"],
    reason: "A close fit for your style with flexible packages and strong planning reviews.",
  },
  {
    id: "elan-signature-events",
    name: "Élan Signature Events",
    category: "Planning & décor",
    location: "Abuja",
    state: "FCT",
    currencyCode: DEFAULT_CURRENCY,
    price: "From ₦1,800,000",
    priceMin: 1800000,
    tier: "Premium",
    rating: "4.9",
    reviews: 48,
    image: "https://naphtalirentals.com/wp-content/uploads/2022/07/291952015_993524448004434_4768468144911484061_n.jpg",
    style: ["Glamorous", "Romantic", "Modern"],
    reason: "Premium creative direction with a reputation for polished, guest-focused celebrations.",
  },
  {
    id: "grand-marquee-lagos",
    name: "Grand Marquee Lagos",
    category: "Venues",
    location: "Lagos",
    state: "Lagos",
    currencyCode: DEFAULT_CURRENCY,
    price: "From ₦3,500,000",
    priceMin: 3500000,
    tier: "Luxury",
    rating: "4.9",
    reviews: 128,
    image: "https://naphtalirentals.com/wp-content/uploads/2022/07/291952015_993524448004434_4768468144911484061_n.jpg",
    style: ["Glamorous", "Modern", "Romantic"],
    reason: "A luxury venue option with capacity for a large guest list and full-scale production.",
  },
];

export function recommendCoupleVendors(preferences: VendorMatchPreferences) {
  return coupleVendors
    .map((vendor) => {
      let score = 72;
      if (vendor.location === preferences.location) score += 9;
      if (preferences.services.includes(vendor.category)) score += 8;
      if (vendor.priceMin <= preferences.budgetCeiling) score += 7;
      if (vendor.style.includes(preferences.style)) score += 4;
      return { ...vendor, score: Math.min(score, 98) };
    })
    .sort((a, b) => b.score - a.score);
}


export type VendorPackage = {
  id: string;
  title: string;
  description: string;
  price: number;
  currencyCode: typeof DEFAULT_CURRENCY;
  featured?: boolean;
  displayOrder: number;
};

export type VendorProfileSeedDetail = {
  about: string;
  travelDistance: string;
  gallery: string[];
  highlights: string[];
  instagram?: string;
  responseTime: string;
  availability: string;
  packages: VendorPackage[];
};

export type MarketplaceVendorDetailRecord = MarketplaceVendorRecord & {
  about: string;
  travelDistance: string;
  gallery: string[];
  highlights: string[];
  instagram: string | null;
  responseTime: string;
  availability: string;
  packages: VendorPackage[];
};

export type MarketplaceVendorDetailResponse = {
  market: typeof DEFAULT_MARKET;
  currency: typeof DEFAULT_CURRENCY;
  vendor: MarketplaceVendorDetailRecord;
};

const packageFor = (
  vendorId: string,
  suffix: string,
  title: string,
  description: string,
  price: number,
  displayOrder: number,
  featured = false,
): VendorPackage => ({
  id: vendorId + "-" + suffix,
  title,
  description,
  price,
  currencyCode: DEFAULT_CURRENCY,
  featured,
  displayOrder,
});

export const vendorProfileDetails: Record<string, VendorProfileSeedDetail> = {
  "aurora-events-ng": {
    about: "Thoughtful planning and styling for Nigerian celebrations, from intimate ceremonies to multi-day traditional and white weddings.",
    travelDistance: "Travels nationwide",
    gallery: [
      "https://ikejabird.com/wp-content/uploads/2025/10/2022-02-01-1.jpg",
      "https://naphtalirentals.com/wp-content/uploads/2022/07/291952015_993524448004434_4768468144911484061_n.jpg",
      "https://www.eventdesignbybe.com/wp-content/uploads/2024/08/Modern-Nigerian-Wedding-Cake-Designs.jpg",
    ],
    highlights: ["8 years’ experience", "160+ celebrations delivered", "Nationwide travel", "Custom packages"],
    instagram: "https://instagram.com",
    responseTime: "Usually replies within 2 hours",
    availability: "Available for selected 2026 and 2027 dates",
    packages: [
      packageFor("aurora-events-ng", "full", "The Full Celebration", "End-to-end planning, vendor coordination, décor concept, guest management and on-the-day production.", 2800000, 1, true),
      packageFor("aurora-events-ng", "styling", "Signature Styling", "Creative direction, venue styling, floral design, tablescape and installation for ceremony and reception.", 850000, 2),
      packageFor("aurora-events-ng", "coordination", "Wedding Day Coordination", "Timeline review, vendor liaison and calm coordination from setup to send-off.", 650000, 3),
    ],
  },
  "lagos-lens-co": {
    about: "Editorial and documentary wedding photography focused on natural moments, family, fashion and the energy of Nigerian celebrations.",
    travelDistance: "Lagos based · Travels across Nigeria",
    gallery: [
      "https://static.wixstatic.com/media/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg",
      "https://ikejabird.com/wp-content/uploads/2025/10/2022-02-01-1.jpg",
      "https://naphtalirentals.com/wp-content/uploads/2022/07/291952015_993524448004434_4768468144911484061_n.jpg",
    ],
    highlights: ["Full-day coverage", "Traditional ceremonies", "Private online gallery", "Nationwide travel"],
    responseTime: "Usually replies the same day",
    availability: "Taking bookings for selected 2026 and 2027 dates",
    packages: [
      packageFor("lagos-lens-co", "essential", "Essential Story", "Up to 8 hours of photography, edited digital gallery and two photographers.", 450000, 1, true),
      packageFor("lagos-lens-co", "full-day", "Full Day Story", "Preparations through reception, two photographers and a premium online gallery.", 750000, 2),
      packageFor("lagos-lens-co", "weekend", "Celebration Weekend", "Traditional and white wedding coverage across two celebration days.", 1200000, 3),
    ],
  },
  "the-bridal-chair": {
    about: "Bridal beauty for modern Nigerian weddings, with soft-glam, traditional and editorial looks tailored to each bride.",
    travelDistance: "Abuja based · Travel available",
    gallery: [
      "https://i.pinimg.com/originals/33/9b/0f/339b0f6a388202ad731f89715e91e442.jpg",
      "https://static.wixstatic.com/media/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg",
      "https://ikejabird.com/wp-content/uploads/2025/10/2022-02-01-1.jpg",
    ],
    highlights: ["Bridal makeup", "Gele styling", "Touch-up service", "Bridal party options"],
    responseTime: "Usually replies within 4 hours",
    availability: "Weekend dates available subject to confirmation",
    packages: [
      packageFor("the-bridal-chair", "classic", "Classic Bride", "Wedding-day makeup and finishing for one bridal look.", 180000, 1, true),
      packageFor("the-bridal-chair", "traditional", "Traditional + White", "Two bridal looks with touch-ups between ceremonies.", 320000, 2),
      packageFor("the-bridal-chair", "party", "Bride + Bridal Party", "Bride plus coordinated makeup for up to four additional people.", 520000, 3),
    ],
  },
  "dripples-cakes": {
    about: "Statement wedding cakes and dessert tables designed around Nigerian celebrations, colour palettes and traditional details.",
    travelDistance: "Lagos delivery · Wider delivery by quote",
    gallery: [
      "https://gallery.dripplescakes.com/assets/images/traditional-marriage-cake-by-dripplescakes-2024-15-1000x1333.webp",
      "https://www.eventdesignbybe.com/wp-content/uploads/2024/08/Modern-Nigerian-Wedding-Cake-Designs.jpg",
      "https://naphtalirentals.com/wp-content/uploads/2022/07/291952015_993524448004434_4768468144911484061_n.jpg",
    ],
    highlights: ["Custom cake design", "Traditional themes", "Dessert tables", "Delivery & setup"],
    responseTime: "Usually replies within 1 business day",
    availability: "Custom orders require advance booking",
    packages: [
      packageFor("dripples-cakes", "signature", "Signature Wedding Cake", "Custom multi-tier cake designed for your palette and guest count.", 250000, 1, true),
      packageFor("dripples-cakes", "dessert", "Cake + Dessert Table", "Wedding cake with a coordinated dessert selection and styled presentation.", 480000, 2),
      packageFor("dripples-cakes", "statement", "Statement Celebration", "Large-format showpiece cake with premium detailing and venue setup.", 750000, 3),
    ],
  },
  "elan-signature-events": {
    about: "Premium event direction for couples who want polished design, detailed guest experience and confident production.",
    travelDistance: "Abuja based · Travels nationwide",
    gallery: [
      "https://naphtalirentals.com/wp-content/uploads/2022/07/291952015_993524448004434_4768468144911484061_n.jpg",
      "https://ikejabird.com/wp-content/uploads/2025/10/2022-02-01-1.jpg",
      "https://static.wixstatic.com/media/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg",
    ],
    highlights: ["Creative direction", "Guest experience", "Production management", "Nationwide travel"],
    responseTime: "Usually replies within 4 hours",
    availability: "Limited premium dates available",
    packages: [
      packageFor("elan-signature-events", "direction", "Creative Direction", "Design concept, styling direction and production planning for your celebration.", 1800000, 1, true),
      packageFor("elan-signature-events", "planning", "Premium Planning", "Full wedding planning, supplier management and event production.", 3200000, 2),
      packageFor("elan-signature-events", "weekend", "Celebration Weekend", "Multi-event planning for traditional, civil and white wedding celebrations.", 4800000, 3),
    ],
  },
  "grand-marquee-lagos": {
    about: "A large-format Lagos celebration venue suited to high-capacity receptions, premium production and statement décor.",
    travelDistance: "Lagos",
    gallery: [
      "https://naphtalirentals.com/wp-content/uploads/2022/07/291952015_993524448004434_4768468144911484061_n.jpg",
      "https://ikejabird.com/wp-content/uploads/2025/10/2022-02-01-1.jpg",
      "https://www.eventdesignbybe.com/wp-content/uploads/2024/08/Modern-Nigerian-Wedding-Cake-Designs.jpg",
    ],
    highlights: ["Large guest capacity", "Production access", "Flexible styling", "Event support team"],
    responseTime: "Usually replies within 1 business day",
    availability: "Availability varies by event date",
    packages: [
      packageFor("grand-marquee-lagos", "venue", "Venue Hire", "Venue access for your reception with standard event support.", 3500000, 1, true),
      packageFor("grand-marquee-lagos", "extended", "Extended Celebration", "Extended venue access for complex setup and large-format production.", 4500000, 2),
      packageFor("grand-marquee-lagos", "premium", "Premium Venue Package", "Venue hire with enhanced production access and event-day support.", 5800000, 3),
    ],
  },
};
