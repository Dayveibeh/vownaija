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
          role text NOT NULL CHECK (role IN ('couple', 'vendor')),
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
          travel_distance text NOT NULL,
          starting_price numeric(14, 2),
          instagram text,
          about text,
          onboarding_complete boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS smitten_users_role_idx ON smitten_users(role)`;
      await sql`CREATE INDEX IF NOT EXISTS vendor_profiles_service_idx ON vendor_profiles(primary_service)`;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
}
