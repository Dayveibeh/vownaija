// From apps/web: node --import tsx --experimental-test-module-mocks --test tests/account-session.test.mjs
import assert from "node:assert/strict";
import { mock, test } from "node:test";

let userId = null;
let storedProfile = null;
let reads = [];
let syncCount = 0;
const profile = { fullName: "Customer A", email: "customer@example.com", role: "couple" };

mock.module("@clerk/nextjs/server", {
  namedExports: { auth: async () => ({ userId }) },
});
mock.module(new URL("../lib/accounts.ts", import.meta.url), {
  namedExports: {
    getUserProfile: async (id) => {
      reads.push(id);
      return storedProfile;
    },
    syncCurrentUserProfile: async () => {
      syncCount++;
      return profile;
    },
  },
});
const { GET } = await import("../app/api/account/session/route.ts");

test("signed-out session checks do not read or write account storage", async () => {
  const response = await GET();
  assert.deepEqual(await response.json(), { signedIn: false });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(reads, []);
  assert.equal(syncCount, 0);
});

test("repeated session checks read the authenticated account without repeating Clerk sync", async () => {
  userId = "customer-a";
  storedProfile = profile;
  for (let i = 0; i < 3; i++) {
    const response = await GET();
    assert.deepEqual(await response.json(), { signedIn: true, profile });
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.deepEqual(reads, ["customer-a", "customer-a", "customer-a"]);
  assert.equal(syncCount, 0);
});

test("an authenticated account missing from storage still bootstraps through Clerk", async () => {
  userId = "new-customer";
  storedProfile = null;
  reads = [];
  const response = await GET();
  assert.deepEqual(await response.json(), { signedIn: true, profile });
  assert.deepEqual(reads, ["new-customer"]);
  assert.equal(syncCount, 1);
});
