// 📦 utils/rateLimiter.js | IMMORTAL FINAL v999999999999 — ULTRA RATE GUARD + MEMGUARD + DEBUG SYNC

const limits = new Map();
const DELAY = 1000;     // 1 sek per valiutą
const JITTER = 200;     // iki 200ms random
const MAX_TRACK = 1000; // max 1000 entries

/**
 * ⏳ Apsaugo nuo per dažno kvietimo pagal valiutą
 * @param {string} currency - pvz. "btc", "eth", "matic", "sol"
 */
export async function rateLimiter(currency) {
  const key = String(currency || "").trim().toLowerCase();
  if (!key) return;

  const now = Date.now();
  const last = limits.get(key) || 0;
  const sinceLast = now - last;
  const waitTime = DELAY - sinceLast;

  if (waitTime > 0) {
    const extra = Math.floor(Math.random() * JITTER);
    const totalWait = waitTime + extra;
    debug(`⏳ [RATE LIMIT] ${key} → delaying ${totalWait}ms`);
    await wait(totalWait);
  }

  limits.set(key, now);

  // 🧹 Auto-clean if memory fills up (older than 60s)
  if (limits.size > MAX_TRACK) {
    let cleaned = 0;
    for (const [k, t] of limits.entries()) {
      if (now - t > 60000) {
        limits.delete(k);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      debug(`🧹 [rateLimiter cleanup] Removed ${cleaned} old entries`);
    }
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function debug(...args) {
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(...args);
  }
}
