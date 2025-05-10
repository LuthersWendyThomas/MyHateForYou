// 📦 utils/fetchCryptoPrice.js | IMMORTAL FINAL v999999999999 — GODMODE ALIASED SYNCED + BULLETPROOF

import fetch from "node-fetch";
import { rateLimiter } from "./rateLimiter.js";
import { ALIASES } from "../config/config.js";

const CACHE_TTL = 5 * 60 * 1000; // 5 min
const cache = {};
const locks = {};

// ✅ Sinchronizuotas palaikymas visose sistemose
const SUPPORTED = {
  BTC:   { gecko: "bitcoin",      coincap: "bitcoin" },
  ETH:   { gecko: "ethereum",     coincap: "ethereum" },
  MATIC: { gecko: "polygon-pos",  coincap: "polygon" },
  SOL:   { gecko: "solana",       coincap: "solana" }
};

export async function fetchCryptoPrice(currency) {
  if (!currency) return null;

  const normalized = ALIASES[String(currency).trim().toLowerCase()] || String(currency).trim().toUpperCase();
  const ids = SUPPORTED[normalized];
  if (!ids) {
    console.warn(`⚠️ Nepalaikoma valiuta: "${currency}"`);
    return null;
  }

  await rateLimiter(normalized); // 🛡️ Anti-spam protection

  if (locks[normalized]) return await locks[normalized];

  const promise = _fetchCryptoPriceInternal(normalized, ids);
  locks[normalized] = promise;

  try {
    return await promise;
  } catch (err) {
    console.error(`❌ [fetchCryptoPrice fatal → ${normalized}]:`, err.message);
    return null;
  } finally {
    delete locks[normalized];
  }
}

async function _fetchCryptoPriceInternal(key, ids) {
  const now = Date.now();
  const cached = cache[key];

  if (cached && now - cached.timestamp < CACHE_TTL) {
    debug(`♻️ [CACHE] ${key} → ${cached.rate}€`);
    return cached.rate;
  }

  const geckoRate = await fetchWithRetry(() => fetchFromCoinGecko(ids.gecko), `CoinGecko → ${key}`);
  if (geckoRate) return saveToCache(key, geckoRate);

  const capRate = await fetchWithRetry(() => fetchFromCoinCap(ids.coincap), `CoinCap → ${key}`);
  if (capRate) return saveToCache(key, capRate);

  throw new Error(`❌ Failed to fetch ${key} from both APIs`);
}

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

  const eurRate = 1.07; // 💡 Galima reali valiutų konversija ateityje
  return +(usd / eurRate).toFixed(2);
}

function saveToCache(currency, rate) {
  cache[currency] = { rate, timestamp: Date.now() };
  debug(`💰 [CACHE SET] ${currency} → ${rate}€`);
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
