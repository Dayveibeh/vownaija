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
      await sql`CREATE INDEX IF NOT EXISTS favourites_user_idx ON favourites(clerk_user_id)`;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
}
