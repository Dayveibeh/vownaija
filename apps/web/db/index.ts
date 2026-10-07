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

export function getSql() {
  if (!sqlClient) sqlClient = createSql();
  return sqlClient!;
}

export function getDb() {
  if (!database) database = createDatabase();
  return database!;
}
