// 📦 utils/fetchCryptoPrice.js | IMMORTAL v3.4 FINAL — USA MARKET DEFENDER LOCK

import fetch from "node-fetch";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = {};
const SUPPORTED = {
  btc: "bitcoin",
  eth: "ethereum",
  matic: "polygon",
  sol: "solana"
};

/**
 * ✅ Public API — returns USD price for selected crypto
 * @param {string} currency - e.g., "btc", "eth"
 * @returns {number|null}
 */
export async function fetchCryptoPrice(currency) {
  if (!currency) return null;

  const clean = String(currency).trim().toLowerCase();
  const mapped = SUPPORTED[clean];
  if (!mapped) {
    log(`❌ Unsupported currency: ${currency}`);
    return null;
  }

  const now = Date.now();
  const cached = cache[clean];

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.rate;
  }

  try {
    const price = await fetchFromCoinGecko(mapped);
    if (price) return saveToCache(clean, price);
  } catch (err) {
    log(`⚠️ CoinGecko error: ${err.message}`);
  }

  try {
    const fallback = await fetchFromCoinCap(mapped);
    if (fallback) return saveToCache(clean, fallback);
  } catch (err) {
    log(`⚠️ CoinCap error: ${err.message}`);
  }

  return null;
}

/**
 * 🔄 CoinGecko with retries and rate-limit detection
 */
async function fetchFromCoinGecko(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;

  for (let i = 0; i < 3; i++) {
    try {
      if (i > 0) await wait(i * 800);

      const res = await fetch(url, {
        headers: { Accept: "application/json" }
      });

      if (res.status === 429) {
        log("⏳ CoinGecko rate limited. Retrying...");
        continue;
      }

      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

      const json = await res.json();
      const price = parseFloat(json?.[id]?.usd);

      if (Number.isFinite(price) && price > 0) {
        return +price.toFixed(2);
      }
    } catch (err) {
      log(`❌ CoinGecko fetch error: ${err.message}`);
    }
  }

  return null;
}

/**
 * 📉 CoinCap fallback API
 */
async function fetchFromCoinCap(id) {
  const url = `https://api.coincap.io/v2/assets/${id}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  if (!res.ok) throw new Error(`CoinCap HTTP ${res.status}`);

  const json = await res.json();
  const usd = parseFloat(json?.data?.priceUsd);

  if (Number.isFinite(usd) && usd > 0) {
    return +usd.toFixed(2);
  }

  throw new Error("CoinCap returned invalid price");
}

/**
 * 🧠 Cache setter + console log (only if debug enabled)
 */
function saveToCache(currency, rate) {
  cache[currency] = { rate, timestamp: Date.now() };

  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(`💰 Cached rate: ${currency.toUpperCase()} → $${rate}`);
  }

  return rate;
}

/**
 * 💤 Timeout helper
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🧾 Logger (debug conditional)
 */
function log(msg) {
  if (process.env.DEBUG_MESSAGES === "true") {
    console.warn(`[fetchCryptoPrice] ${msg}`);
  }
}
