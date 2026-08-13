export type CoupleVendor = {
  name: string;
  category: string;
  location: string;
  price: string;
  priceMin: number;
  tier: "Budget-friendly" | "Mid-range" | "Premium" | "Luxury";
  rating: string;
  reviews: number;
  image: string;
  style: string[];
  reason: string;
};

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
    name: "The Bridal Chair",
    category: "Bridal beauty",
    location: "Abuja",
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
    name: "Dripples Cakes",
    category: "Cakes & desserts",
    location: "Lagos",
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
    name: "Lagos Lens Co.",
    category: "Photography",
    location: "Lagos",
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
    name: "Aurora Events NG",
    category: "Planning & décor",
    location: "Lagos",
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
    name: "Élan Signature Events",
    category: "Planning & décor",
    location: "Abuja",
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
    name: "Grand Marquee Lagos",
    category: "Venues",
    location: "Lagos",
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
