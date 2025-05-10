// 📦 utils/rateLimiter.js | IMMORTAL FINAL v999999999999999 — GODMODE RATE SHIELD + AUTO MEMGUARD + DEBUG SYNCED

const limits = new Map();
const DELAY = 1000;       // ⏱ pagrindinis delay tarp užklausų (ms)
const JITTER = 200;       // 🔀 random papildomas delay
const MAX_TRACK = 1000;   // 🧠 max entries apsaugai nuo memory leak
const CLEAN_THRESHOLD = 60000; // ⌛ entry senėjimo limitas (60s)

/**
 * ⏳ Apsaugo nuo per dažno valiutų kvietimo (Gecko/CoinCap/RPC)
 * @param {string} currency - pvz. "btc", "eth", "matic", "sol"
 */
export async function rateLimiter(currency) {
  const raw = String(currency || "").trim();
  const key = raw.toLowerCase();
  if (!key) return;

  const now = Date.now();
  const last = limits.get(key) || 0;
  const elapsed = now - last;
  const baseDelay = DELAY - elapsed;

  if (baseDelay > 0) {
    const extra = Math.floor(Math.random() * JITTER);
    const totalDelay = baseDelay + extra;
    debug(`⏳ [RATE LIMIT] ${key} → delaying ${totalDelay}ms`);
    await wait(totalDelay);
  }

  limits.set(key, now);

  if (limits.size > MAX_TRACK) {
    let cleaned = 0;
    for (const [k, t] of limits.entries()) {
      if (now - t > CLEAN_THRESHOLD) {
        limits.delete(k);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      debug(`🧹 [rateLimiter cleanup] Removed ${cleaned} old entries`);
    }
  }
}

/**
 * ⏱ Delay helper
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🪵 Debug logger (respects DEBUG_MESSAGES=true)
 */
function debug(...args) {
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(...args);
  }
}
