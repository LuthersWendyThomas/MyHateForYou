// 📦 utils/fetchCryptoPrice.js | FINAL IMMORTAL v3.5 — LOCKED MARKET SYNC BULLETPROOF EDITION

import fetch from "node-fetch";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = {};

// ✅ Supported currency mapping
const SUPPORTED = {
  btc: "bitcoin",
  eth: "ethereum",
  matic: "polygon",
  sol: "solana"
};

/**
 * ✅ Public API: gets crypto price in USD (cached)
 * @param {string} currency - one of: btc, eth, matic, sol
 * @returns {number|null}
 */
export async function fetchCryptoPrice(currency) {
  if (!currency) return null;

  const key = String(currency).trim().toLowerCase();
  const id = SUPPORTED[key];
  if (!id) {
    log(`❌ Unsupported currency: ${currency}`);
    return null;
  }

  const now = Date.now();
  const cached = cache[key];

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.rate;
  }

  try {
    const price = await fetchFromCoinGecko(id);
    if (price) return saveToCache(key, price);
  } catch (err) {
    log(`⚠️ CoinGecko error: ${err.message}`);
  }

  try {
    const fallback = await fetchFromCoinCap(id);
    if (fallback) return saveToCache(key, fallback);
  } catch (err) {
    log(`⚠️ CoinCap error: ${err.message}`);
  }

  return null;
}

/**
 * 🔄 CoinGecko price fetch with retry and rate limit handling
 */
async function fetchFromCoinGecko(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await wait(attempt * 800);

      const res = await fetch(url, {
        headers: { Accept: "application/json" }
      });

      if (res.status === 429) {
        log("⏳ CoinGecko rate limited. Retrying...");
        continue;
      }

      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

      const data = await res.json();
      const usd = parseFloat(data?.[id]?.usd);

      if (Number.isFinite(usd) && usd > 0) {
        return +usd.toFixed(2);
      }
    } catch (err) {
      log(`❌ CoinGecko fetch error: ${err.message}`);
    }
  }

  return null;
}

/**
 * 📉 CoinCap fallback fetch
 */
async function fetchFromCoinCap(id) {
  const url = `https://api.coincap.io/v2/assets/${id}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  if (!res.ok) throw new Error(`CoinCap HTTP ${res.status}`);

  const data = await res.json();
  const usd = parseFloat(data?.data?.priceUsd);

  if (Number.isFinite(usd) && usd > 0) {
    return +usd.toFixed(2);
  }

  throw new Error("CoinCap returned invalid price");
}

/**
 * 🧠 Saves to cache and logs
 */
function saveToCache(currency, rate) {
  cache[currency] = { rate, timestamp: Date.now() };

  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(`💰 [CACHE] ${currency.toUpperCase()} → $${rate}`);
  }

  return rate;
}

/**
 * 💤 Delay helper
 */
function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/**
 * 🧾 Debug log (conditional)
 */
function log(message) {
  if (process.env.DEBUG_MESSAGES === "true") {
    console.warn(`[fetchCryptoPrice] ${message}`);
  }
}
