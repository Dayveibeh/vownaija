import { sql } from "drizzle-orm";
import { boolean, check, index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("smitten_users", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["couple", "vendor"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("smitten_users_role_idx").on(table.role),
  check("smitten_users_role_check", sql`${table.role} in ('couple', 'vendor')`),
]);

export const vendorProfiles = pgTable("vendor_profiles", {
  clerkUserId: text("clerk_user_id").primaryKey().references(() => users.clerkUserId, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  contactName: text("contact_name").notNull(),
  businessEmail: text("business_email").notNull(),
  phone: text("phone").notNull(),
  yearsInBusiness: text("years_in_business").notNull(),
  primaryService: text("primary_service").notNull(),
  location: text("location").notNull(),
  travelDistance: text("travel_distance").notNull(),
  startingPrice: numeric("starting_price", { precision: 14, scale: 2 }),
  instagram: text("instagram"),
  about: text("about"),
  onboardingComplete: boolean("onboarding_complete").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("vendor_profiles_service_idx").on(table.primaryService)]);

export type UserRole = "couple" | "vendor";
export type SmittenUser = typeof users.$inferSelect;
export type VendorProfile = typeof vendorProfiles.$inferSelect;
