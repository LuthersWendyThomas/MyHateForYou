// 📦 utils/fetchCryptoPrice.js | IMMORTAL FINAL v99999999 — ULTRA BULLETPROOF

import fetch from "node-fetch";
import { rateLimiter } from "./rateLimiter.js";

const CACHE_TTL = 5 * 60 * 1000; // 5 min
const cache = {};
const locks = {};

// 🔐 TIKSLŪS CoinGecko + CoinCap ID’ai
const SUPPORTED = {
  btc:   { gecko: "bitcoin",      coincap: "bitcoin" },
  eth:   { gecko: "ethereum",     coincap: "ethereum" },
  matic: { gecko: "polygon-pos",  coincap: "polygon" },
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
  } catch (err) {
    console.error(`❌ [fetchCryptoPrice fatal → ${clean}]:`, err.message);
    return null;
  } finally {
    delete locks[clean];
  }
}

async function _fetchCryptoPriceInternal(clean, ids) {
  const now = Date.now();
  const cached = cache[clean];

  if (cached && now - cached.timestamp < CACHE_TTL) {
    debug(`♻️ [CACHE] ${clean.toUpperCase()} → ${cached.rate}€`);
    return cached.rate;
  }

  const geckoRate = await fetchWithRetry(() => fetchFromCoinGecko(ids.gecko), `CoinGecko → ${clean}`);
  if (geckoRate) return saveToCache(clean, geckoRate);

  const capRate = await fetchWithRetry(() => fetchFromCoinCap(ids.coincap), `CoinCap → ${clean}`);
  if (capRate) return saveToCache(clean, capRate);

  throw new Error(`❌ Failed to fetch ${clean.toUpperCase()} from both APIs`);
}

// 📡 Retry wrapper with exponential backoff
async function fetchWithRetry(fn, label, retries = 3, baseDelay = 1500) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) await wait(i * baseDelay);
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️ [Retry ${i + 1}/${retries} → ${label}]: ${err.message}`);
    }
  }
  throw lastErr;
}

async function fetchFromCoinGecko(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Node.js fetch agent)"
    }
  });

  if (res.status === 429) throw new Error("429 Rate Limit (Gecko)");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  debug(`📡 [Gecko ${id}] →`, json);

  const price = parseFloat(json?.[id]?.eur);
  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid Gecko price");

  return +price.toFixed(2);
}

async function fetchFromCoinCap(id) {
  const url = `https://api.coincap.io/v2/assets/${id}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Node.js fetch agent)"
    }
  });

  if (res.status === 429) throw new Error("429 Rate Limit (CoinCap)");
  if (res.status === 404) throw new Error(`ID "${id}" not found`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  debug(`📡 [CoinCap ${id}] →`, json);

  const usd = parseFloat(json?.data?.priceUsd);
  if (!Number.isFinite(usd) || usd <= 0) throw new Error("Invalid CoinCap price");

  const eurRate = 1.07; // optional: real-time FX rate in future
  return +(usd / eurRate).toFixed(2);
}

function saveToCache(currency, rate) {
  cache[currency] = { rate, timestamp: Date.now() };
  debug(`💰 [CACHE SET] ${currency.toUpperCase()} → ${rate}€`);
  return rate;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function debug(...args) {
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(...args);
  }
}
