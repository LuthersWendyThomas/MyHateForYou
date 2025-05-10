// 📦 utils/fetchCryptoPrice.js | IMMORTAL FINAL v999999999999999999999999 — ULTRA LOCKED 24/7

import fetch from "node-fetch";
import { rateLimiter } from "./rateLimiter.js";

const CACHE_TTL = 5 * 60 * 1000;
const cache = {};
const locks = {};

// 🔐 API ID mapping: CoinGecko + CoinCap
const SUPPORTED = {
  btc: { gecko: "bitcoin",      coincap: "bitcoin" },
  eth: { gecko: "ethereum",     coincap: "ethereum" },
  matic: { gecko: "polygon",    coincap: "polygon" },
  sol: { gecko: "solana",       coincap: "solana" }
};

/**
 * ✅ Grąžina EUR kursą pagal valiutą
 * @param {string} currency - pvz. "btc", "eth", "matic", "sol"
 * @returns {number|null}
 */
export async function fetchCryptoPrice(currency) {
  if (!currency) return null;

  const clean = String(currency).trim().toLowerCase();
  const ids = SUPPORTED[clean];
  if (!ids) {
    console.warn(`⚠️ Nepalaikoma valiuta: "${currency}"`);
    return null;
  }

  await rateLimiter(clean); // ⛔️ anti-spam lock

  // ⛓️ Single-call lock per coin
  if (locks[clean]) return await locks[clean];
  const promise = _fetchCryptoPriceInternal(clean, ids);
  locks[clean] = promise;

  try {
    return await promise;
  } finally {
    delete locks[clean]; // 🔓 unlock
  }
}

/**
 * 🔁 Vidinis fetch logika su cache + fallback
 */
async function _fetchCryptoPriceInternal(clean, ids) {
  const now = Date.now();
  const cached = cache[clean];

  if (cached && now - cached.timestamp < CACHE_TTL) {
    if (process.env.DEBUG_MESSAGES === "true") {
      console.log(`♻️ [CACHE] ${clean.toUpperCase()} → ${cached.rate}€`);
    }
    return cached.rate;
  }

  // ⬆️ CoinGecko
  try {
    const rate = await fetchFromCoinGecko(ids.gecko);
    if (rate) return saveToCache(clean, rate);
  } catch (err) {
    console.warn(`⚠️ [CoinGecko klaida → ${clean}]: ${err.message}`);
  }

  // ⬇️ CoinCap
  try {
    const rate = await fetchFromCoinCap(ids.coincap);
    if (rate) return saveToCache(clean, rate);
  } catch (err) {
    console.warn(`⚠️ [CoinCap klaida → ${clean}]: ${err.message}`);
  }

  return null;
}

/**
 * 📡 CoinGecko su retry
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
        console.warn("⏳ CoinGecko rate limited. Retrying...");
        continue;
      }

      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

      const json = await res.json();
      if (process.env.DEBUG_MESSAGES === "true") {
        console.log(`📡 [Gecko RAW → ${id}]:`, json);
      }

      const price = parseFloat(json?.[id]?.eur);
      if (Number.isFinite(price) && price > 0) return +price.toFixed(2);
    } catch (err) {
      console.warn(`❌ [Gecko retry ${i + 1}/3]: ${err.message}`);
    }
  }

  return null;
}

/**
 * 🧭 CoinCap fallback (USD → EUR)
 */
async function fetchFromCoinCap(id) {
  const url = `https://api.coincap.io/v2/assets/${id}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Node.js fetch agent)"
    }
  });

  if (!res.ok) throw new Error(`CoinCap HTTP ${res.status}`);

  const json = await res.json();
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(`📡 [CoinCap RAW → ${id}]:`, json);
  }

  const usd = parseFloat(json?.data?.priceUsd);
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error(`❌ CoinCap netinkamas USD kursas: ${usd}`);
  }

  const eurRate = 1.07;
  return +(usd / eurRate).toFixed(2);
}

/**
 * 💾 Įrašo į cache
 */
function saveToCache(currency, rate) {
  cache[currency] = { rate, timestamp: Date.now() };
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(`💰 [CACHE] ${currency.toUpperCase()} → ${rate}€`);
  }
  return rate;
}

/**
 * ⏳ Async delay
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
