// 📦 utils/fetchCryptoPrice.js | IMMORTAL v3.2 BULLETPROOF RETRY + CACHE FIXED

import fetch from "node-fetch";

const CACHE_TTL = 5 * 60 * 1000;
const cache = {};
const SUPPORTED = {
  btc: "bitcoin",
  eth: "ethereum",
  matic: "polygon",
  sol: "solana"
};

/**
 * Returns the EUR exchange rate for a currency using CoinGecko (with retry) or CoinCap as fallback
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

  // --- CoinGecko with retry attempts
  try {
    const price = await fetchFromCoinGecko(mapped);
    if (price) {
      saveToCache(clean, price);
      return price;
    }
  } catch (err) {
    console.warn(`⚠️ [CoinGecko error]: ${err.message}`);
  }

  // --- CoinCap fallback
  try {
    const price = await fetchFromCoinCap(mapped);
    if (price) {
      saveToCache(clean, price);
      return price;
    }
  } catch (err) {
    console.warn(`⚠️ [CoinCap error]: ${err.message}`);
  }

  return null;
}

/**
 * CoinGecko with 3x retry logic
 */
async function fetchFromCoinGecko(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur`;
  for (let i = 0; i < 3; i++) {
    try {
      await wait(i * 800); // gradually increasing delay
      const res = await fetch(url, {
        headers: { Accept: "application/json" }
      });

      if (res.status === 429) {
        console.warn("⏳ CoinGecko rate limit – retrying...");
        continue;
      }

      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
      const json = await res.json();
      const price = parseFloat(json?.[id]?.eur);
      if (!isNaN(price) && price > 0) return price;
    } catch (e) {
      console.warn("❌ CoinGecko retry error:", e.message);
    }
  }
  return null;
}

/**
 * CoinCap fallback
 */
async function fetchFromCoinCap(id) {
  const url = `https://api.coincap.io/v2/assets/${id}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  if (!res.ok) throw new Error(`CoinCap HTTP ${res.status}`);
  const json = await res.json();
  const usd = parseFloat(json?.data?.priceUsd);

  if (!isNaN(usd) && usd > 0) {
    const eurRate = 1.07;
    return +(usd / eurRate).toFixed(2);
  }

  return null;
}

/**
 * Stores result in memory cache
 */
function saveToCache(currency, rate) {
  cache[currency] = { rate, timestamp: Date.now() };
  console.log(`✅ [fetchCryptoPrice] Cache updated: ${currency.toUpperCase()} → ${rate}€`);
}

/**
 * Async delay (used for retry logic)
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
