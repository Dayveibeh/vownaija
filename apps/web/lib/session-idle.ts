export const SESSION_IDLE_MS = 10 * 60_000;
export const SESSION_WARNING_MS = 2 * 60_000;

type ActivityStorage = Pick<Storage, "getItem" | "setItem">;

// Keep the same deadline across refreshes and tabs for this Clerk session.
// Background requests, visibility changes and polling never call activity().
export function createIdleClock(storage: ActivityStorage, key: string, now: () => number = Date.now) {
  const read = () => {
    try {
      const value = Number(storage.getItem(key));
      return value > 0 && Number.isFinite(value) && value <= now() ? value : null;
    } catch { return null; }
  };
  let ended = false;
  try { ended = storage.getItem(key) === "expired"; } catch { /* Storage is optional. */ }
  let lastActivity = read() ?? now();
  const persist = () => { try { storage.setItem(key, String(lastActivity)); } catch { /* In-memory timer still enforces idle logout. */ } };
  if (!ended) persist();
  const sync = () => {
    try { if (storage.getItem(key) === "expired") ended = true; } catch { /* Storage is optional. */ }
    const shared = read(); if (shared !== null) lastActivity = Math.max(lastActivity, shared);
  };
  const expire = () => { ended = true; try { storage.setItem(key, "expired"); } catch { /* In-memory expiry remains. */ } };
  const remaining = () => {
    sync();
    const value = Math.max(0, SESSION_IDLE_MS - (now() - lastActivity));
    if (value <= 0) expire();
    return ended ? 0 : value;
  };
  return {
    remaining,
    expire,
    activity() {
      if (remaining() <= 0) return false;
      lastActivity = now(); persist(); return true;
    },
  };
}
