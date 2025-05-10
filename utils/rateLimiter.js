// 📦 utils/rateLimiter.js | IMMORTAL FINAL v999999999 — ULTRA RATE GUARD

const limits = new Map();
const DELAY = 1000; // 1 sek per valiutą
const JITTER = 200; // papildomas random delay (iki 200ms)
const MAX_TRACK = 1000; // max 1000 unikalių valiutų (apsauga nuo memory leak)

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

  limits.set(key, Date.now());

  // 💡 Valo senas valiutas, kad išvengtų atminties perpildymo
  if (limits.size > MAX_TRACK) {
    for (const [k, t] of limits.entries()) {
      if (now - t > 60000) limits.delete(k);
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
