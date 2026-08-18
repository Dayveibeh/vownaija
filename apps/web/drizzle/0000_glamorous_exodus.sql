CREATE TABLE "smitten_users" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "smitten_users_email_unique" UNIQUE("email"),
	CONSTRAINT "smitten_users_role_check" CHECK ("smitten_users"."role" in ('couple', 'vendor'))
);
--> statement-breakpoint
CREATE TABLE "vendor_profiles" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"business_email" text NOT NULL,
	"phone" text NOT NULL,
	"years_in_business" text NOT NULL,
	"primary_service" text NOT NULL,
	"location" text NOT NULL,
	"travel_distance" text NOT NULL,
	"starting_price" numeric(14, 2),
	"instagram" text,
	"about" text,
	"onboarding_complete" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_clerk_user_id_smitten_users_clerk_user_id_fk" FOREIGN KEY ("clerk_user_id") REFERENCES "public"."smitten_users"("clerk_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "smitten_users_role_idx" ON "smitten_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "vendor_profiles_service_idx" ON "vendor_profiles" USING btree ("primary_service");