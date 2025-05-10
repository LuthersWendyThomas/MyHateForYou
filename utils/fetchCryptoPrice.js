// 📦 utils/fetchCryptoPrice.js | IMMORTAL v9999999999 — BULLETPROOF MAX LOCKED+GECKO-CAP SYNC

import fetch from "node-fetch";

const CACHE_TTL = 5 * 60 * 1000;
const cache = {};

// 🔐 Currency ID mappings per API
const SUPPORTED = {
  btc: { gecko: "bitcoin", coincap: "bitcoin" },
  eth: { gecko: "ethereum", coincap: "ethereum" },
  matic: { gecko: "polygon-pos", coincap: "polygon" },
  sol: { gecko: "solana", coincap: "solana" }
};

/**
 * ✅ Public API — returns EUR price for selected crypto
 * @param {string} currency - e.g., "btc", "eth", "matic", "sol"
 * @returns {number|null}
 */
export async function fetchCryptoPrice(currency) {
  if (!currency) return null;

  const clean = String(currency).trim().toLowerCase();
  const mapping = SUPPORTED[clean];
  if (!mapping) {
    console.warn(`⚠️ Unsupported currency: "${currency}"`);
    return null;
  }

  const now = Date.now();
  const cached = cache[clean];
  if (cached && now - cached.timestamp < CACHE_TTL) {
    if (process.env.DEBUG_MESSAGES === "true") {
      console.log(`♻️ [CACHE] Using cached ${clean.toUpperCase()} → ${cached.rate}€`);
    }
    return cached.rate;
  }

  // ✅ Try CoinGecko (primary)
  try {
    const price = await fetchFromCoinGecko(mapping.gecko);
    if (price) return saveToCache(clean, price);
  } catch (err) {
    console.warn(`⚠️ [CoinGecko failed for ${clean}]: ${err.message}`);
  }

  // 🔁 Try CoinCap (fallback)
  try {
    const price = await fetchFromCoinCap(mapping.coincap);
    if (price) return saveToCache(clean, price);
  } catch (err) {
    console.warn(`⚠️ [CoinCap failed for ${clean}]: ${err.message}`);
  }

  return null;
}

/**
 * 🔁 CoinGecko API (3 retries, EUR)
 */
async function fetchFromCoinGecko(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur`;

  for (let i = 0; i < 3; i++) {
    try {
      if (i > 0) await wait(i * 700); // Delay grows
      const res = await fetch(url, {
        headers: { Accept: "application/json" }
      });

      if (res.status === 429) {
        console.warn("⏳ CoinGecko rate limited. Retrying...");
        continue;
      }

      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

      const json = await res.json();
      const price = parseFloat(json?.[id]?.eur);

      if (Number.isFinite(price) && price > 0) return +price.toFixed(2);
    } catch (e) {
      console.warn(`❌ [CoinGecko retry ${i + 1}/3]: ${e.message}`);
    }
  }

  return null;
}

/**
 * 📉 CoinCap fallback — uses USD + static EUR conversion
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
    throw new Error(`Invalid USD price for ${id}`);
  }

  const eurRate = 1.07; // Optionally dynamic
  return +(usd / eurRate).toFixed(2);
}

/**
 * 💾 Caches the rate in memory
 */
function saveToCache(currency, rate) {
  cache[currency] = { rate, timestamp: Date.now() };
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(`💰 [CACHE UPDATED] ${currency.toUpperCase()} → ${rate}€`);
  }
  return rate;
}

/**
 * 💤 Delay helper
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
