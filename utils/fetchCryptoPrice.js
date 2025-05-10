// 📦 utils/fetchCryptoPrice.js | IMMORTAL v99999999 — BULLETPROOF SYNC LOCKED+

import fetch from "node-fetch";

const CACHE_TTL = 5 * 60 * 1000; // 5 min
const cache = {};

// ✅ Supported currency mapping (used by APIs)
const SUPPORTED = {
  btc: "bitcoin",
  eth: "ethereum",
  matic: "polygon-pos",
  sol: "solana"
};

/**
 * ✅ Public API — returns EUR price for selected crypto
 */
export async function fetchCryptoPrice(currency) {
  if (!currency) return null;

  const clean = String(currency).trim().toLowerCase();
  const mapped = SUPPORTED[clean];
  if (!mapped) {
    console.warn(`⚠️ Unsupported currency: ${currency}`);
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
    console.warn(`⚠️ [CoinGecko error]: ${err.message}`);
  }

  try {
    const price = await fetchFromCoinCap(mapped);
    if (price) return saveToCache(clean, price);
  } catch (err) {
    console.warn(`⚠️ [CoinCap error]: ${err.message}`);
  }

  return null;
}

/**
 * 🔁 CoinGecko with retry logic (3x)
 */
async function fetchFromCoinGecko(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur`;

  for (let i = 0; i < 3; i++) {
    try {
      if (i > 0) await wait(i * 800); // Delay grows
      const res = await fetch(url, {
        headers: { Accept: "application/json" }
      });

      if (res.status === 429) {
        console.warn("⏳ CoinGecko rate limit — retrying...");
        continue;
      }

      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

      const json = await res.json();
      const price = parseFloat(json?.[id]?.eur);

      if (Number.isFinite(price) && price > 0) {
        return +price.toFixed(2);
      }
    } catch (e) {
      console.warn(`❌ [CoinGecko retry error]: ${e.message}`);
    }
  }

  return null;
}

/**
 * 📉 CoinCap fallback (USD → EUR)
 */
async function fetchFromCoinCap(id) {
  const url = `https://api.coincap.io/v2/assets/${id}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  if (!res.ok) throw new Error(`CoinCap HTTP ${res.status}`);

  const json = await res.json();
  const usd = parseFloat(json?.data?.priceUsd);

  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error("CoinCap returned invalid USD price");
  }

  const eurRate = 1.07; // Static conversion — can be dynamic later
  return +(usd / eurRate).toFixed(2);
}

/**
 * 💾 Cache save helper
 */
function saveToCache(currency, rate) {
  cache[currency] = { rate, timestamp: Date.now() };

  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(`💰 [CACHE] ${currency.toUpperCase()} → ${rate}€`);
  }

  return rate;
}

/**
 * ⏳ Delay helper
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
