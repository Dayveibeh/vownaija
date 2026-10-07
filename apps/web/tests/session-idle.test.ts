import assert from "node:assert/strict";
import { test } from "node:test";
import { createIdleClock, SESSION_IDLE_MS } from "../lib/session-idle";

function fixture() {
  let time = 1_000_000;
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  return { values, storage, now: () => time, advance: (ms: number) => { time += ms; } };
}
test("inactivity expires at ten minutes and late interaction cannot revive it", () => {
  const f = fixture(), clock = createIdleClock(f.storage, "session-a", f.now);
  assert.equal(SESSION_IDLE_MS, 600_000);
  f.advance(599_999); assert.equal(clock.remaining(), 1);
  f.advance(1); assert.equal(clock.remaining(), 0); assert.equal(clock.activity(), false);
  assert.equal(createIdleClock(f.storage, "session-a", f.now).remaining(), 0);
});
test("real activity resets the deadline; checking the clock and reloading do not", () => {
  const f = fixture(), clock = createIdleClock(f.storage, "session-a", f.now);
  f.advance(540_000); assert.equal(clock.activity(), true);
  f.advance(300_000); assert.equal(clock.remaining(), 300_000);
  const reloaded = createIdleClock(f.storage, "session-a", f.now);
  assert.equal(reloaded.remaining(), 300_000);
  f.advance(300_000); assert.equal(reloaded.remaining(), 0);
});
test("tabs share activity; background wakeups enforce overdue expiry; fresh sign-ins get a new timer", () => {
  const f = fixture(), first = createIdleClock(f.storage, "session-a", f.now), second = createIdleClock(f.storage, "session-a", f.now);
  f.advance(300_000); second.activity();
  f.advance(300_000); assert.equal(first.remaining(), 300_000);
  f.advance(400_000); assert.equal(first.remaining(), 0); assert.equal(second.activity(), false);
  assert.equal(createIdleClock(f.storage, "session-b", f.now).remaining(), 600_000);
});
test("blocked storage and invalid timestamps do not crash or disable the timer", () => {
  const f = fixture();
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  const clock = createIdleClock(blocked, "session", f.now);
  f.advance(600_000); assert.equal(clock.remaining(), 0);
  f.values.set("future", String(f.now() + 900_000));
  const future = createIdleClock(f.storage, "future", f.now);
  f.advance(600_000); assert.equal(future.remaining(), 0);
});
test("explicit sign-out stays expired while Clerk sign-out is retried", () => {
  const f = fixture(), clock = createIdleClock(f.storage, "session", f.now);
  clock.expire(); assert.equal(clock.activity(), false);
  assert.equal(createIdleClock(f.storage, "session", f.now).remaining(), 0);
});
