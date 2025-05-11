// 📦 utils/rateLimiter.js | IMMORTAL FINAL v999999999.∞ — GODMODE RATE SHIELD + MEMGUARD + DEBUG LOCKED

const limits = new Map();

const DELAY_MS = 1000;         // ⏱️ Bazinis užklausų tarpas
const JITTER_MS = 200;         // 🔀 Atsitiktinis papildomas delay
const MAX_ENTRIES = 1000;      // 🧠 Apsauga nuo memory leak
const CLEANUP_THRESHOLD = 60_000; // ⌛ Pašalinti senus įrašus (>60s)

/**
 * 🛡️ Užtikrina saugų dažnio ribojimą pagal raktą (valiuta/API)
 * @param {string} key - pvz. "btc", "eth", "sol", kt.
 */
export async function rateLimiter(key) {
  try {
    const id = String(key || "").trim().toLowerCase();
    if (!id) return;

    const now = Date.now();
    const last = limits.get(id) || 0;
    const elapsed = now - last;
    const waitTime = DELAY_MS - elapsed;

    if (waitTime > 0) {
      const jitter = Math.floor(Math.random() * JITTER_MS);
      const totalDelay = waitTime + jitter;
      debug(`⏳ [RATE LIMIT] ${id} → wait ${totalDelay}ms`);
      await wait(totalDelay);
    }

    limits.set(id, now);

    if (limits.size > MAX_ENTRIES) cleanOldEntries(now);
  } catch (err) {
    console.error("❌ [rateLimiter error]:", err.message || err);
  }
}

/**
 * 🧹 Valo pasenusius įrašus
 */
function cleanOldEntries(now) {
  let cleaned = 0;
  for (const [key, ts] of limits.entries()) {
    if (now - ts > CLEANUP_THRESHOLD) {
      limits.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) debug(`🧹 [rateLimiter] Cleaned ${cleaned} old keys`);
}

/**
 * ⏱ Delay helper
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🪵 Debug logger
 */
function debug(...args) {
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(...args);
  }
}
