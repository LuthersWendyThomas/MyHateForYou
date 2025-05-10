import fetch from "node-fetch";
import { rateLimiter } from "./rateLimiter.js";

const CACHE_TTL = 5 * 60 * 1000;
const cache = {};
const locks = {};

// 🔐 TIKSLŪS CoinGecko + CoinCap ID’ai
const SUPPORTED = {
  btc:   { gecko: "bitcoin",      coincap: "bitcoin" },
  eth:   { gecko: "ethereum",     coincap: "ethereum" },
  matic: { gecko: "polygon",  coincap: "polygon" }, // ✅ FIXED HERE
  sol:   { gecko: "solana",       coincap: "solana" }
};

export async function fetchCryptoPrice(currency) {
  if (!currency) return null;

  const clean = String(currency).trim().toLowerCase();
  const ids = SUPPORTED[clean];
  if (!ids) {
    console.warn(`⚠️ Nepalaikoma valiuta: "${currency}"`);
    return null;
  }

  await rateLimiter(clean); // ⛔️ Rate guard

  if (locks[clean]) return await locks[clean];

  const promise = _fetchCryptoPriceInternal(clean, ids);
  locks[clean] = promise;

  try {
    return await promise;
  } finally {
    delete locks[clean];
  }
}

async function _fetchCryptoPriceInternal(clean, ids) {
  const now = Date.now();
  const cached = cache[clean];

  if (cached && now - cached.timestamp < CACHE_TTL) {
    if (process.env.DEBUG_MESSAGES === "true") {
      console.log(`♻️ [CACHE] ${clean.toUpperCase()} → ${cached.rate}€`);
    }
    return cached.rate;
  }

  try {
    const geckoRate = await fetchFromCoinGecko(ids.gecko);
    if (geckoRate) return saveToCache(clean, geckoRate);
  } catch (err) {
    console.warn(`⚠️ [CoinGecko klaida → ${clean}]: ${err.message}`);
  }

  try {
    const capRate = await fetchFromCoinCap(ids.coincap);
    if (capRate) return saveToCache(clean, capRate);
  } catch (err) {
    console.warn(`⚠️ [CoinCap klaida → ${clean}]: ${err.message}`);
  }

  return null;
}

/**
 * ✅ CoinGecko — tikslus, patikimas, paprastas endpointas
 */
async function fetchFromCoinGecko(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur`;

  for (let i = 0; i < 3; i++) {
    try {
      if (i > 0) await wait(i * 1000);

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Node.js fetch agent)"
        }
      });

      if (res.status === 429) {
        console.warn(`⏳ CoinGecko rate limited. Retry ${i + 1}/3`);
        continue;
      }

      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

      const json = await res.json();
      if (process.env.DEBUG_MESSAGES === "true") {
        console.log(`📡 [Gecko ${id}] →`, json);
      }

      const price = parseFloat(json?.[id]?.eur);
      if (Number.isFinite(price) && price > 0) {
        return +price.toFixed(2);
      } else {
        throw new Error(`⚠️ Invalid price from CoinGecko for "${id}"`);
      }
    } catch (err) {
      console.warn(`❌ [Gecko retry ${i + 1}] → ${err.message}`);
    }
  }

  return null;
}

/**
 * ✅ CoinCap — fallback (USD → EUR)
 */
async function fetchFromCoinCap(id) {
  const url = `https://api.coincap.io/v2/assets/${id}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Node.js fetch agent)"
    }
  });

  if (res.status === 404) {
    throw new Error(`CoinCap ID "${id}" not found`);
  }

  if (!res.ok) throw new Error(`CoinCap HTTP ${res.status}`);

  const json = await res.json();
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(`📡 [CoinCap ${id}] →`, json);
  }

  const usd = parseFloat(json?.data?.priceUsd);
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error(`Invalid CoinCap USD price for "${id}"`);
  }

  const eurRate = 1.07; // ← gali ateity konvertuoti dinamiškai
  return +(usd / eurRate).toFixed(2);
}

function saveToCache(currency, rate) {
  cache[currency] = { rate, timestamp: Date.now() };
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(`💰 [CACHE SET] ${currency.toUpperCase()} → ${rate}€`);
  }
  return rate;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
