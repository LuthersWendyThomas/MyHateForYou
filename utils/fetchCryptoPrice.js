// utils/fetchCryptoPrice.js | IMMORTAL FINAL v1.0.0•GODMODE DIAMONDLOCK
// RATE-LIMITED • CONCURRENCY LOCK • CACHE (5 min) • USD-ONLY • BULLETPROOF

import fetch from "node-fetch";
import { rateLimiter } from "./rateLimiter.js";
import { ALIASES } from "../config/config.js";

const CACHE_TTL = 5 * 60_000;        // 5 minutes
const cache     = {};                // { [key]: { rate, ts } }
const locks     = {};                // { [symbol]: Promise }

/** Supported symbols and their API IDs */
const SUPPORTED = {
  BTC:   { gecko: "bitcoin",        coincap: "bitcoin"       },
  ETH:   { gecko: "ethereum",       coincap: "ethereum"      },
  MATIC: { gecko: "matic-network",  coincap: "matic-network" },
  SOL:   { gecko: "solana",         coincap: "solana"        }
};

/**
 * 🔁 Main entry: fetch USD price for a currency symbol (with alias support).
 * Returns null on unsupported or fatal errors.
 *
 * @param {string} currency – e.g. "btc", "Matic", "eth"
 * @returns {Promise<number|null>} USD price
 */
export async function fetchCryptoPrice(currency) {
  if (!currency) return null;

  // normalize input via ALIASES then uppercase
  const norm = ALIASES[String(currency).toLowerCase()] ||
               String(currency).trim().toUpperCase();
  const ids  = SUPPORTED[norm];
  if (!ids) {
    console.warn(`⚠️ Unsupported currency: "${currency}"`);
    return null;
  }

  // apply rate limiting per symbol
  await rateLimiter(norm);

  // concurrency lock: reuse in-flight promise
  if (locks[norm]) {
    return locks[norm];
  }
  const promise = _fetchCryptoPriceInternal(norm, ids);
  locks[norm] = promise;

  try {
    return await promise;
  } catch (err) {
    console.error(`❌ [fetchCryptoPrice fatal → ${norm}]:`, err.message);
    return null;
  } finally {
    delete locks[norm];
  }
}

/** Internal: check cache, then sequentially try Gecko then CoinCap */
async function _fetchCryptoPriceInternal(symbol, { gecko, coincap }) {
  const now = Date.now();
  const entry = cache[symbol];
  if (entry && now - entry.ts < CACHE_TTL) {
    debug(`♻️ [CACHE HIT] ${symbol} → $${entry.rate}`);
    return entry.rate;
  }

  // 1) Try CoinGecko
  try {
    const rate = await fetchWithRetry(
      () => fetchFromGecko(gecko),
      `CoinGecko → ${symbol}`
    );
    return save(symbol, rate);
  } catch (err) {
    console.warn(`⚠️ [Gecko failed → ${symbol}]:`, err.message);
  }

  // 2) Fallback to CoinCap
  try {
    const rate = await fetchWithRetry(
      () => fetchFromCoincap(coincap),
      `CoinCap → ${symbol}`
    );
    return save(symbol, rate);
  } catch (err) {
    console.warn(`⚠️ [CoinCap failed → ${symbol}]:`, err.message);
  }

  throw new Error(`❌ All price sources failed for "${symbol}"`);
}

/** Retry wrapper with exponential backoff */
async function fetchWithRetry(fn, label, retries = 3, baseDelay = 1200) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) await wait(i * baseDelay);
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️ [Retry ${i+1}/${retries} → ${label}]:`, err.message);
    }
  }
  throw lastErr;
}

/** Fetch price from CoinGecko (USD) */
async function fetchFromGecko(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price`
    + `?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Node.js" }
  });
  if (res.status === 429) throw new Error("429 Rate Limit (Gecko)");
  if (!res.ok) throw new Error(`Gecko HTTP ${res.status}`);
  const json = await res.json();
  const usd  = json[id]?.usd;
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error(`Invalid Gecko response for "${id}"`);
  }
  return +usd.toFixed(2);
}

/** Fetch price from CoinCap (USD) */
async function fetchFromCoincap(id) {
  // direct lookup
  let res = await fetch(`https://api.coincap.io/v2/assets/${encodeURIComponent(id)}`, {
    headers: { "User-Agent": "Node.js" }
  });
  let data;
  if (res.ok) {
    data = await res.json();
  } else {
    // fallback search
    res = await fetch(`https://api.coincap.io/v2/assets?search=${encodeURIComponent(id)}`, {
      headers: { "User-Agent": "Node.js" }
    });
    if (!res.ok) throw new Error(`CoinCap HTTP ${res.status}`);
    const list = (await res.json()).data || [];
    if (!list.length) throw new Error(`No CoinCap asset for "${id}"`);
    data = { data: list[0] };
  }
  const price = Number(data.data.priceUsd);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid CoinCap response for "${id}"`);
  }
  return +price.toFixed(2);
}

/** Save rate to cache */
function save(symbol, rate) {
  cache[symbol] = { rate, ts: Date.now() };
  debug(`💾 [CACHE SET] ${symbol} → $${rate}`);
  return rate;
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function debug(...args) { if (process.env.DEBUG_MESSAGES === "true") console.log(...args); }
