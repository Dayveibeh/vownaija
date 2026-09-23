import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function databaseUrl() {
  const value = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (!value) {
    throw new Error("Smitten account storage is not configured. Connect the Neon database to this deployment.");
  }

  return value;
}

function createSql() {
  return neon(databaseUrl());
}

type SqlClient = ReturnType<typeof createSql>;
let sqlClient: SqlClient | null = null;

function createDatabase() {
  return drizzle(getSql(), { schema });
}

type Database = ReturnType<typeof createDatabase>;
let database: Database | null = null;
let schemaPromise: Promise<void> | null = null;

export function getSql() {
  if (!sqlClient) sqlClient = createSql();
  return sqlClient!;
}

export function getDb() {
  if (!database) database = createDatabase();
  return database!;
}

export async function ensureDatabaseSchema() {
  if (!schemaPromise) {
    const sql = getSql();
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS smitten_users (
          clerk_user_id text PRIMARY KEY,
          email text NOT NULL UNIQUE,
          full_name text NOT NULL,
          role text NOT NULL CHECK (role IN ('couple', 'vendor', 'admin')),
          country_code text NOT NULL DEFAULT 'NG',
          currency_code text NOT NULL DEFAULT 'NGN',
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`ALTER TABLE smitten_users ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'NG'`;
      await sql`ALTER TABLE smitten_users ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'NGN'`;
      await sql`ALTER TABLE smitten_users DROP CONSTRAINT IF EXISTS smitten_users_role_check`;
      await sql`ALTER TABLE smitten_users ADD CONSTRAINT smitten_users_role_check CHECK (role IN ('couple', 'vendor', 'admin'))`;

      await sql`
        CREATE TABLE IF NOT EXISTS customer_profiles (
          clerk_user_id text PRIMARY KEY REFERENCES smitten_users(clerk_user_id) ON DELETE CASCADE,
          wedding_date date,
          wedding_location text,
          wedding_state text,
          wedding_type text,
          guest_count text,
          budget_band text,
          budget_ceiling numeric(14, 2),
          currency_code text NOT NULL DEFAULT 'NGN',
          wedding_style text,
          required_services jsonb NOT NULL DEFAULT '[]'::jsonb,
          onboarding_complete boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS vendor_profiles (
          clerk_user_id text PRIMARY KEY REFERENCES smitten_users(clerk_user_id) ON DELETE CASCADE,
          business_name text NOT NULL,
          contact_name text NOT NULL,
          business_email text NOT NULL,
          phone text NOT NULL,
          years_in_business text NOT NULL,
          primary_service text NOT NULL,
          location text NOT NULL,
          state text,
          travel_distance text NOT NULL,
          starting_price numeric(14, 2),
          currency_code text NOT NULL DEFAULT 'NGN',
          instagram text,
          about text,
          onboarding_complete boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS state text`;
      await sql`ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'NGN'`;

      await sql`
        CREATE TABLE IF NOT EXISTS marketplace_vendors (
          id text PRIMARY KEY,
          business_name text NOT NULL,
          category text NOT NULL,
          location text NOT NULL,
          state text,
          starting_price numeric(14, 2) NOT NULL,
          currency_code text NOT NULL DEFAULT 'NGN',
          tier text NOT NULL,
          rating numeric(3, 2) NOT NULL,
          review_count integer NOT NULL DEFAULT 0,
          image_url text NOT NULL,
          styles jsonb NOT NULL DEFAULT '[]'::jsonb,
          match_reason text NOT NULL,
          active boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      await sql`ALTER TABLE marketplace_vendors ADD COLUMN IF NOT EXISTS owner_clerk_user_id text REFERENCES smitten_users(clerk_user_id) ON DELETE SET NULL`;
      await sql`ALTER TABLE marketplace_vendors ADD COLUMN IF NOT EXISTS about text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE marketplace_vendors ADD COLUMN IF NOT EXISTS travel_distance text NOT NULL DEFAULT 'Nigeria'`;
      await sql`ALTER TABLE marketplace_vendors ADD COLUMN IF NOT EXISTS gallery jsonb NOT NULL DEFAULT '[]'::jsonb`;
      await sql`ALTER TABLE marketplace_vendors ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '[]'::jsonb`;
      await sql`ALTER TABLE marketplace_vendors ADD COLUMN IF NOT EXISTS instagram text`;
      await sql`ALTER TABLE marketplace_vendors ADD COLUMN IF NOT EXISTS response_time text NOT NULL DEFAULT 'Usually replies within 1 business day'`;
      await sql`ALTER TABLE marketplace_vendors ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'Contact vendor to confirm availability'`;

      await sql`
        CREATE TABLE IF NOT EXISTS vendor_packages (
          id text PRIMARY KEY,
          vendor_id text NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
          title text NOT NULL,
          description text NOT NULL,
          price numeric(14, 2) NOT NULL,
          currency_code text NOT NULL DEFAULT 'NGN',
          featured boolean NOT NULL DEFAULT false,
          display_order integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS enquiries (
          id text PRIMARY KEY,
          customer_clerk_user_id text NOT NULL REFERENCES smitten_users(clerk_user_id) ON DELETE CASCADE,
          vendor_id text NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
          package_id text REFERENCES vendor_packages(id) ON DELETE SET NULL,
          requested_service text,
          wedding_date date,
          wedding_location text NOT NULL,
          guest_count text,
          budget_band text,
          contact_name text,
          contact_email text,
          message text NOT NULL,
          status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','active','closed')),
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      await sql`ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS contact_name text`;
      await sql`ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS contact_email text`;

      await sql`
        CREATE TABLE IF NOT EXISTS conversations (
          id text PRIMARY KEY,
          enquiry_id text NOT NULL UNIQUE REFERENCES enquiries(id) ON DELETE CASCADE,
          customer_clerk_user_id text NOT NULL REFERENCES smitten_users(clerk_user_id) ON DELETE CASCADE,
          vendor_id text NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
          vendor_owner_clerk_user_id text REFERENCES smitten_users(clerk_user_id) ON DELETE SET NULL,
          last_message_at timestamptz NOT NULL DEFAULT now(),
          customer_last_read_at timestamptz,
          vendor_last_read_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS messages (
          id text PRIMARY KEY,
          conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_clerk_user_id text NOT NULL REFERENCES smitten_users(clerk_user_id) ON DELETE CASCADE,
          body text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS quotes (
          id text PRIMARY KEY,
          conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          enquiry_id text NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
          vendor_id text NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
          vendor_owner_clerk_user_id text NOT NULL REFERENCES smitten_users(clerk_user_id) ON DELETE CASCADE,
          customer_clerk_user_id text NOT NULL REFERENCES smitten_users(clerk_user_id) ON DELETE CASCADE,
          title text NOT NULL,
          notes text,
          subtotal numeric(14,2) NOT NULL,
          discount_amount numeric(14,2) NOT NULL DEFAULT 0,
          additional_fees numeric(14,2) NOT NULL DEFAULT 0,
          total numeric(14,2) NOT NULL,
          currency_code text NOT NULL DEFAULT 'NGN',
          valid_until date,
          revision integer NOT NULL DEFAULT 1,
          status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','viewed','accepted','declined','expired')),
          sent_at timestamptz NOT NULL DEFAULT now(),
          viewed_at timestamptz,
          responded_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS quote_items (
          id text PRIMARY KEY,
          quote_id text NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
          title text NOT NULL,
          description text,
          quantity integer NOT NULL DEFAULT 1,
          unit_price numeric(14,2) NOT NULL,
          line_total numeric(14,2) NOT NULL,
          display_order integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS bookings (
          id text PRIMARY KEY,
          quote_id text NOT NULL UNIQUE REFERENCES quotes(id) ON DELETE RESTRICT,
          conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE RESTRICT,
          enquiry_id text NOT NULL REFERENCES enquiries(id) ON DELETE RESTRICT,
          vendor_id text NOT NULL REFERENCES marketplace_vendors(id) ON DELETE RESTRICT,
          vendor_owner_clerk_user_id text NOT NULL REFERENCES smitten_users(clerk_user_id) ON DELETE RESTRICT,
          customer_clerk_user_id text NOT NULL REFERENCES smitten_users(clerk_user_id) ON DELETE RESTRICT,
          wedding_date date,
          wedding_location text NOT NULL,
          service_summary text NOT NULL,
          total numeric(14,2) NOT NULL,
          currency_code text NOT NULL DEFAULT 'NGN',
          status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','completed','cancelled')),
          confirmed_at timestamptz NOT NULL DEFAULT now(),
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS favourites (
          clerk_user_id text NOT NULL REFERENCES smitten_users(clerk_user_id) ON DELETE CASCADE,
          vendor_id text NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (clerk_user_id, vendor_id)
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS smitten_users_role_idx ON smitten_users(role)`;
      await sql`CREATE INDEX IF NOT EXISTS customer_profiles_location_idx ON customer_profiles(wedding_location)`;
      await sql`CREATE INDEX IF NOT EXISTS customer_profiles_state_idx ON customer_profiles(wedding_state)`;
      await sql`CREATE INDEX IF NOT EXISTS vendor_profiles_service_idx ON vendor_profiles(primary_service)`;
      await sql`CREATE INDEX IF NOT EXISTS marketplace_vendors_category_idx ON marketplace_vendors(category)`;
      await sql`CREATE INDEX IF NOT EXISTS marketplace_vendors_location_idx ON marketplace_vendors(location)`;
      await sql`CREATE INDEX IF NOT EXISTS marketplace_vendors_state_idx ON marketplace_vendors(state)`;
      await sql`CREATE INDEX IF NOT EXISTS vendor_packages_vendor_idx ON vendor_packages(vendor_id)`;
      await sql`CREATE INDEX IF NOT EXISTS marketplace_vendors_owner_idx ON marketplace_vendors(owner_clerk_user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS enquiries_customer_idx ON enquiries(customer_clerk_user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS enquiries_vendor_idx ON enquiries(vendor_id)`;
      await sql`CREATE INDEX IF NOT EXISTS enquiries_status_idx ON enquiries(status)`;
      await sql`CREATE INDEX IF NOT EXISTS conversations_customer_idx ON conversations(customer_clerk_user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS conversations_vendor_owner_idx ON conversations(vendor_owner_clerk_user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS conversations_vendor_idx ON conversations(vendor_id)`;
      await sql`CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id)`;
      await sql`CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages(sender_clerk_user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS quotes_conversation_idx ON quotes(conversation_id)`;
      await sql`CREATE INDEX IF NOT EXISTS quotes_vendor_owner_idx ON quotes(vendor_owner_clerk_user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS quotes_customer_idx ON quotes(customer_clerk_user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes(status)`;
      await sql`CREATE INDEX IF NOT EXISTS quote_items_quote_idx ON quote_items(quote_id)`;
      await sql`CREATE INDEX IF NOT EXISTS bookings_vendor_owner_idx ON bookings(vendor_owner_clerk_user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings(customer_clerk_user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status)`;
      await sql`CREATE INDEX IF NOT EXISTS favourites_user_idx ON favourites(clerk_user_id)`;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
}
