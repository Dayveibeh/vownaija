import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, date } from "drizzle-orm/pg-core";

export const users = pgTable("smitten_users", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["couple", "vendor", "admin"] }).notNull(),
  countryCode: text("country_code").default("NG").notNull(),
  currencyCode: text("currency_code").default("NGN").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("smitten_users_role_idx").on(table.role),
  check("smitten_users_role_check", sql`${table.role} in ('couple', 'vendor', 'admin')`),
]);

export const customerProfiles = pgTable("customer_profiles", {
  clerkUserId: text("clerk_user_id").primaryKey().references(() => users.clerkUserId, { onDelete: "cascade" }),
  weddingDate: date("wedding_date"),
  weddingLocation: text("wedding_location"),
  weddingState: text("wedding_state"),
  weddingType: text("wedding_type"),
  guestCount: text("guest_count"),
  budgetBand: text("budget_band"),
  budgetCeiling: numeric("budget_ceiling", { precision: 14, scale: 2 }),
  currencyCode: text("currency_code").default("NGN").notNull(),
  weddingStyle: text("wedding_style"),
  requiredServices: jsonb("required_services").$type<string[]>().default([]).notNull(),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("customer_profiles_location_idx").on(table.weddingLocation),
  index("customer_profiles_state_idx").on(table.weddingState),
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
  state: text("state"),
  travelDistance: text("travel_distance").notNull(),
  startingPrice: numeric("starting_price", { precision: 14, scale: 2 }),
  currencyCode: text("currency_code").default("NGN").notNull(),
  instagram: text("instagram"),
  about: text("about"),
  onboardingComplete: boolean("onboarding_complete").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("vendor_profiles_service_idx").on(table.primaryService)]);

export const marketplaceVendors = pgTable("marketplace_vendors", {
  id: text("id").primaryKey(),
  ownerClerkUserId: text("owner_clerk_user_id").references(() => users.clerkUserId, { onDelete: "set null" }),
  businessName: text("business_name").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  state: text("state"),
  startingPrice: numeric("starting_price", { precision: 14, scale: 2 }).notNull(),
  currencyCode: text("currency_code").default("NGN").notNull(),
  tier: text("tier").notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull(),
  reviewCount: integer("review_count").default(0).notNull(),
  imageUrl: text("image_url").notNull(),
  styles: jsonb("styles").$type<string[]>().default([]).notNull(),
  matchReason: text("match_reason").notNull(),
  about: text("about").default("").notNull(),
  travelDistance: text("travel_distance").default("Nigeria").notNull(),
  gallery: jsonb("gallery").$type<string[]>().default([]).notNull(),
  highlights: jsonb("highlights").$type<string[]>().default([]).notNull(),
  instagram: text("instagram"),
  responseTime: text("response_time").default("Usually replies within 1 business day").notNull(),
  availability: text("availability").default("Contact vendor to confirm availability").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("marketplace_vendors_category_idx").on(table.category),
  index("marketplace_vendors_location_idx").on(table.location),
  index("marketplace_vendors_state_idx").on(table.state),
  index("marketplace_vendors_owner_idx").on(table.ownerClerkUserId),
]);

export const vendorPackages = pgTable("vendor_packages", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull().references(() => marketplaceVendors.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  currencyCode: text("currency_code").default("NGN").notNull(),
  featured: boolean("featured").default(false).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("vendor_packages_vendor_idx").on(table.vendorId),
]);

export const enquiries = pgTable("enquiries", {
  id: text("id").primaryKey(),
  customerClerkUserId: text("customer_clerk_user_id").notNull().references(() => users.clerkUserId, { onDelete: "cascade" }),
  vendorId: text("vendor_id").notNull().references(() => marketplaceVendors.id, { onDelete: "cascade" }),
  packageId: text("package_id").references(() => vendorPackages.id, { onDelete: "set null" }),
  requestedService: text("requested_service"),
  weddingDate: date("wedding_date"),
  weddingLocation: text("wedding_location").notNull(),
  guestCount: text("guest_count"),
  budgetBand: text("budget_band"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  message: text("message").notNull(),
  status: text("status", { enum: ["new", "active", "closed"] }).default("new").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("enquiries_customer_idx").on(table.customerClerkUserId),
  index("enquiries_vendor_idx").on(table.vendorId),
  index("enquiries_status_idx").on(table.status),
]);

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  enquiryId: text("enquiry_id").notNull().unique().references(() => enquiries.id, { onDelete: "cascade" }),
  customerClerkUserId: text("customer_clerk_user_id").notNull().references(() => users.clerkUserId, { onDelete: "cascade" }),
  vendorId: text("vendor_id").notNull().references(() => marketplaceVendors.id, { onDelete: "cascade" }),
  vendorOwnerClerkUserId: text("vendor_owner_clerk_user_id").references(() => users.clerkUserId, { onDelete: "set null" }),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
  customerLastReadAt: timestamp("customer_last_read_at", { withTimezone: true }),
  vendorLastReadAt: timestamp("vendor_last_read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("conversations_customer_idx").on(table.customerClerkUserId),
  index("conversations_vendor_owner_idx").on(table.vendorOwnerClerkUserId),
  index("conversations_vendor_idx").on(table.vendorId),
]);

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderClerkUserId: text("sender_clerk_user_id").notNull().references(() => users.clerkUserId, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("messages_conversation_idx").on(table.conversationId),
  index("messages_sender_idx").on(table.senderClerkUserId),
]);

export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  enquiryId: text("enquiry_id").notNull().references(() => enquiries.id, { onDelete: "cascade" }),
  vendorId: text("vendor_id").notNull().references(() => marketplaceVendors.id, { onDelete: "cascade" }),
  vendorOwnerClerkUserId: text("vendor_owner_clerk_user_id").notNull().references(() => users.clerkUserId, { onDelete: "cascade" }),
  customerClerkUserId: text("customer_clerk_user_id").notNull().references(() => users.clerkUserId, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  additionalFees: numeric("additional_fees", { precision: 14, scale: 2 }).default("0").notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  currencyCode: text("currency_code").default("NGN").notNull(),
  validUntil: date("valid_until"),
  revision: integer("revision").default(1).notNull(),
  status: text("status", { enum: ["sent", "viewed", "accepted", "declined", "expired"] }).default("sent").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("quotes_conversation_idx").on(table.conversationId),
  index("quotes_vendor_owner_idx").on(table.vendorOwnerClerkUserId),
  index("quotes_customer_idx").on(table.customerClerkUserId),
  index("quotes_status_idx").on(table.status),
]);

export const quoteItems = pgTable("quote_items", {
  id: text("id").primaryKey(),
  quoteId: text("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("quote_items_quote_idx").on(table.quoteId),
]);

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  quoteId: text("quote_id").notNull().unique().references(() => quotes.id, { onDelete: "restrict" }),
  conversationId: text("conversation_id").notNull().unique().references(() => conversations.id, { onDelete: "restrict" }),
  enquiryId: text("enquiry_id").notNull().references(() => enquiries.id, { onDelete: "restrict" }),
  vendorId: text("vendor_id").notNull().references(() => marketplaceVendors.id, { onDelete: "restrict" }),
  vendorOwnerClerkUserId: text("vendor_owner_clerk_user_id").notNull().references(() => users.clerkUserId, { onDelete: "restrict" }),
  customerClerkUserId: text("customer_clerk_user_id").notNull().references(() => users.clerkUserId, { onDelete: "restrict" }),
  weddingDate: date("wedding_date"),
  weddingLocation: text("wedding_location").notNull(),
  serviceSummary: text("service_summary").notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  currencyCode: text("currency_code").default("NGN").notNull(),
  status: text("status", { enum: ["confirmed", "completed", "cancelled"] }).default("confirmed").notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("bookings_vendor_owner_idx").on(table.vendorOwnerClerkUserId),
  index("bookings_customer_idx").on(table.customerClerkUserId),
  index("bookings_status_idx").on(table.status),
]);

export const favourites = pgTable("favourites", {
  clerkUserId: text("clerk_user_id").notNull().references(() => users.clerkUserId, { onDelete: "cascade" }),
  vendorId: text("vendor_id").notNull().references(() => marketplaceVendors.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.clerkUserId, table.vendorId] }),
  index("favourites_user_idx").on(table.clerkUserId),
]);

export type UserRole = "couple" | "vendor" | "admin";
export type SmittenUser = typeof users.$inferSelect;
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type VendorProfile = typeof vendorProfiles.$inferSelect;
export type MarketplaceVendor = typeof marketplaceVendors.$inferSelect;

export type VendorPackageRecord = typeof vendorPackages.$inferSelect;

export type Enquiry = typeof enquiries.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type ConversationMessage = typeof messages.$inferSelect;

export type QuoteRecord = typeof quotes.$inferSelect;
export type QuoteItemRecord = typeof quoteItems.$inferSelect;
export type BookingRecord = typeof bookings.$inferSelect;
