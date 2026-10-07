import { neonConfig } from "@neondatabase/serverless";
import { NextRequest } from "next/server";
import { GET } from "../app/api/vendors/route";

// Measure handler/database time without frontend or network-to-VPS overhead.
// Refuse database writes, including accidental future setup regressions.
let roundTrips = 0;
neonConfig.fetchFunction = async (url: string | URL | Request, options?: RequestInit) => {
  const payload = JSON.parse(String(options?.body));
  const queries = payload.queries ?? [payload];
  if (queries.some((query: { query: string }) => !/^select\s/i.test(query.query.trim()))) {
    throw new Error("Vendor benchmark permits SELECT queries only.");
  }
  roundTrips++;
  return fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
};

for (let run = 1; run <= 3; run++) {
  roundTrips = 0;
  const started = performance.now();
  const response = await GET(new NextRequest("https://smitten.example/api/vendors"));
  const data = await response.json();
  console.log(JSON.stringify({
    run, status: response.status, vendors: data.count,
    milliseconds: Math.round(performance.now() - started), databaseRoundTrips: roundTrips,
  }));
  if (!response.ok) { process.exitCode = 1; break; }
}
