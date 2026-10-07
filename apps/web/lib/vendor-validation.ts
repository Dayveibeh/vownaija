import { z } from "zod";

export const vendorServices = ["Planning & coordination", "Décor & styling", "Photography", "Catering", "Bridal beauty", "Music & entertainment", "Cakes", "Venues", "Bead styling"];
export const nigeriaStates = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];

export const nairaInput = z.string().trim()
  .refine((value) => /^(\d{1,12}|\d{1,3}(,\d{3}){1,3})(\.\d{1,2})?$/.test(value), "Enter a valid amount in naira (up to two decimal places).")
  .transform((value) => value.replace(/,/g, ""));

export const instagramInput = z.string().trim().max(180).transform((value, context) => {
  if (!value) return "";
  const candidate = value.startsWith("@") ? `https://www.instagram.com/${value.slice(1)}`
    : /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.hostname) || url.username || url.password) throw new Error();
    return url.href;
  } catch {
    context.addIssue({ code: "custom", message: "Enter an Instagram profile URL or @username." });
    return z.NEVER;
  }
});

export const vendorProfileSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name").max(120),
  contactName: z.string().trim().min(2, "Enter your full name").max(120),
  businessEmail: z.string().trim().email("Enter a valid business email").max(254),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(30).refine((value) => /^\+?[\d ()-]+$/.test(value) && value.replace(/\D/g, "").length >= 7, "Enter a valid phone number."),
  yearsInBusiness: z.string().trim().min(1).max(60),
  primaryService: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2, "Enter the city or area where you work").max(160),
  state: z.string().refine((value) => nigeriaStates.includes(value), "Choose your state."),
  travelDistance: z.enum(["My city only", "My state", "Neighbouring states", "Nationwide"]),
  startingPrice: nairaInput,
  instagram: instagramInput,
  about: z.string().trim().min(20, "Tell couples a little more about your business").max(1200),
});

export const vendorPackageSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(1600),
  price: nairaInput,
  featured: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(100).default(0),
});

export type VendorProfileForm = z.input<typeof vendorProfileSchema>;
export type VendorPackageInput = z.output<typeof vendorPackageSchema>;
