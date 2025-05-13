// utils/rateLimiter.js | IMMORTAL FINAL v999999999.∞ — GODMODE RATE SHIELD + MEMGUARD + DEBUG LOCKED

const limits = new Map();

const DELAY_MS = 1000;             // ⏱️ Base delay between calls
const JITTER_MS = 200;             // 🔀 Random extra delay
const MAX_ENTRIES = 1000;          // 🧠 Prevent unbounded growth
const CLEANUP_THRESHOLD = 60_000;  // ⌛ Remove entries older than 60s

/**
 * 🛡️ Per-key rate limiter (currency/API granularity).
 * @param {string} key – e.g. "btc", "eth", "sol"
 */
export async function rateLimiter(key) {
  try {
    const id = String(key || "").trim().toLowerCase();
    if (!id) return;

    const now     = Date.now();
    const last    = limits.get(id) || 0;
    const elapsed = now - last;
    const waitFor = DELAY_MS - elapsed;

    if (waitFor > 0) {
      const jitter     = Math.floor(Math.random() * JITTER_MS);
      const totalDelay = waitFor + jitter;
      debug(`⏳ [RATE LIMIT] ${id} → wait ${totalDelay}ms`);
      await wait(totalDelay);
    }

    limits.set(id, Date.now());

    if (limits.size > MAX_ENTRIES) {
      cleanOldEntries(Date.now());
    }
  } catch (err) {
    console.error("❌ [rateLimiter error]:", err.message || err);
  }
}

/** 🧹 Remove stale entries to avoid memory leaks */
function cleanOldEntries(now) {
  let cleaned = 0;
  for (const [key, ts] of limits.entries()) {
    if (now - ts > CLEANUP_THRESHOLD) {
      limits.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    debug(`🧹 [rateLimiter] Cleaned ${cleaned} old keys`);
  }
}

/** ⏱ Promise-based sleep */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 🪵 Conditional debug logging (enable with DEBUG_MESSAGES="true") */
function debug(...args) {
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(...args);
  }
}
