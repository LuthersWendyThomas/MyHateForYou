// 📦 utils/rateLimiter.js | IMMORTAL FINAL v999999999 — RATE GUARD

const limits = {};
const DELAY = 1000; // 1 sek per valiutą
const JITTER = 200; // papildomas random delay (iki 200ms)

/**
 * ⏳ Apsaugo nuo per dažno kvietimo pagal valiutą
 * @param {string} currency - pvz. "btc", "eth", "matic", "sol"
 */
export async function rateLimiter(currency) {
  const key = String(currency).trim().toLowerCase();
  const now = Date.now();
  const last = limits[key] || 0;

  const sinceLast = now - last;
  const waitTime = DELAY - sinceLast;

  if (waitTime > 0) {
    const extra = Math.floor(Math.random() * JITTER);
    const totalWait = waitTime + extra;
    if (process.env.DEBUG_MESSAGES === "true") {
      console.log(`⏳ [RATE LIMIT] ${key} → delaying ${totalWait}ms`);
    }
    await wait(totalWait);
  }

  limits[key] = Date.now();
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
