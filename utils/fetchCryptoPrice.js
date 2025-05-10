// 📦 utils/fetchCryptoPrice.js | IMMORTAL v999999999999 FINAL+ LOCKED UNTOUCHABLE

import fetch from "node-fetch";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = {};

// ✅ API-specific ID mappings
const SUPPORTED = {
  btc: { gecko: "bitcoin", coincap: "bitcoin" },
  eth: { gecko: "ethereum", coincap: "ethereum" },
  matic: { gecko: "polygon-pos", coincap: "polygon" },
  sol: { gecko: "solana", coincap: "solana" }
};

/**
 * ✅ Public method — returns EUR price for selected crypto
 * @param {string} currency - e.g. "btc", "eth", "matic", "sol"
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
      console.log(`♻️ [CACHE] ${clean.toUpperCase()} → ${cached.rate}€`);
    }
    return cached.rate;
  }

  // ✅ CoinGecko first
  try {
    const rate = await fetchFromCoinGecko(mapping.gecko);
    if (rate) return saveToCache(clean, rate);
  } catch (err) {
    console.warn(`⚠️ [CoinGecko failed for ${clean}]: ${err.message}`);
  }

  // 🔁 CoinCap fallback
  try {
    const rate = await fetchFromCoinCap(mapping.coincap);
    if (rate) return saveToCache(clean, rate);
  } catch (err) {
    console.warn(`⚠️ [CoinCap failed for ${clean}]: ${err.message}`);
  }

  return null;
}

/**
 * 🔁 CoinGecko (3x retry, 1500ms+ delay)
 */
async function fetchFromCoinGecko(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur`;

  for (let i = 0; i < 3; i++) {
    try {
      if (i > 0) await wait(i * 1500); // 1.5s, 3s, ...
      const res = await fetch(url, { headers: { Accept: "application/json" } });

      if (res.status === 429) {
        console.warn("⏳ CoinGecko rate limited. Retrying...");
        continue;
      }

      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

      const json = await res.json();
      const price = parseFloat(json?.[id]?.eur);

      if (Number.isFinite(price) && price > 0) return +price.toFixed(2);
    } catch (err) {
      console.warn(`❌ [CoinGecko retry ${i + 1}/3]: ${err.message}`);
    }
  }

  return null;
}

/**
 * 📉 CoinCap fallback — USD → EUR conversion
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

  const eurRate = 1.07; // 💶 Static fallback conversion
  return +(usd / eurRate).toFixed(2);
}

/**
 * 💾 Save to RAM cache
 */
function saveToCache(currency, rate) {
  cache[currency] = { rate, timestamp: Date.now() };
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(`💰 [CACHE UPDATED] ${currency.toUpperCase()} → ${rate}€`);
  }
  return rate;
}

/**
 * 💤 Async wait
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
