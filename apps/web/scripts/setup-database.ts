import { setupDatabaseSchema } from "../db/setup";
import { seedMarketplace } from "../db/seed";

try {
  await setupDatabaseSchema();
  await seedMarketplace();
  console.log("Smitten database setup complete.");
} catch {
  // Do not include connection URLs or database parameters in deployment logs.
  console.error("Smitten database setup failed. Check DATABASE_URL/POSTGRES_URL and database access.");
  process.exitCode = 1;
}
