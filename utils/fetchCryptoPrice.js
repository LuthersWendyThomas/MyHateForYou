// utils/fetchCryptoPrice.js | IMMORTAL FINAL v2.0.0•GODMODE DIAMONDLOCK
// RATE-LIMITED • CONCURRENCY LOCK • CACHE (5 min) • USD-ONLY • BULLETPROOF

import fetch from "node-fetch";
import { rateLimiter } from "./rateLimiter.js";
import { ALIASES } from "../config/config.js";

const CACHE_TTL = 5 * 60_000;        // 5 minutes
const cache     = {};                // { [symbol]: { rate, ts } }
const locks     = {};                // { [symbol]: Promise }

/**
 * Network configuration: hardcoded endpoints & parsers.
 * Add or update entries here for supported symbols.
 */
const NETWORKS = {
  BTC: {
    coinGecko: {
      url: () => 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      extract: json => json.bitcoin?.usd
    },
    coinCap: {
      url: () => 'https://api.coincap.io/v2/assets/bitcoin',
      extract: json => json.data?.priceUsd
    }
  },
  ETH: {
    coinGecko: {
      url: () => 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      extract: json => json.ethereum?.usd
    },
    coinCap: {
      url: () => 'https://api.coincap.io/v2/assets/ethereum',
      extract: json => json.data?.priceUsd
    }
  },
  MATIC: {
    coinGecko: {
      url: () => 'https://api.coingecko.com/api/v3/simple/price?ids=polygon&vs_currencies=usd',
      extract: json => json.polygon?.usd
    },
    coinCap: {
      url: () => 'https://api.coincap.io/v2/assets/polygon',
      extract: json => json.data?.priceUsd
    }
  },
  SOL: {
    coinGecko: {
      url: () => 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      extract: json => json.solana?.usd
    },
    coinCap: {
      url: () => 'https://api.coincap.io/v2/assets/solana',
      extract: json => json.data?.priceUsd
    }
  }
  // ... extend with more symbols as needed
};

/**
 * 🔁 Main entry: fetch USD price for a currency symbol (with alias support).
 * Returns null on unsupported or fatal errors.
 */
export async function fetchCryptoPrice(rawSymbol) {
  if (!rawSymbol) return null;
  
  // normalize symbol (alias → uppercase)
  const norm = (ALIASES[rawSymbol.toLowerCase()] || rawSymbol).trim().toUpperCase();
  const config = NETWORKS[norm];
  if (!config) {
    console.warn(`⚠️ Unsupported currency: "${rawSymbol}"`);
    return null;
  }

  // rate-limit per symbol
  await rateLimiter(norm);

  // concurrency lock
  if (locks[norm]) return locks[norm];
  const promise = _fetchAndCache(norm, config);
  locks[norm] = promise;
  try {
    return await promise;
  } finally {
    delete locks[norm];
  }
}

/**
 * Internal: apply cache, then try each provider.
 */
async function _fetchAndCache(symbol, { coinGecko, coinCap }) {
  const now = Date.now();
  const hit = cache[symbol];
  if (hit && now - hit.ts < CACHE_TTL) {
    return hit.rate;
  }

  // try providers in order
  for (const provider of [coinGecko, coinCap]) {
    try {
      const rate = await _fetchWithRetry(() => _fetchFrom(provider));
      if (rate > 0) {
        cache[symbol] = { rate, ts: Date.now() };
        return rate;
      }
    } catch (err) {
      console.warn(`⚠️ [${symbol} → ${provider === coinGecko ? 'Gecko' : 'CoinCap'}]`, err.message);
    }
  }

  throw new Error(`❌ All price sources failed for "${symbol}"`);
}

/**
 * Fetch + parse JSON from a provider
 */
async function _fetchFrom({ url, extract }) {
  const res = await fetch(url(), { headers: { 'User-Agent': 'Node.js' } });
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After')) || 1;
    throw new RateLimitError(`429 - retry after ${retryAfter}s`, retryAfter * 1000);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  const val  = Number(extract(json));
  if (!Number.isFinite(val) || val <= 0) {
    throw new Error('Invalid response payload');
  }
  return +val.toFixed(2);
}

/**
 * Retry wrapper: exponential backoff + jitter, handles RateLimitError
 */
async function _fetchWithRetry(fn, retries = 3, base = 1000) {
  let err;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      err = e;
      const delay = e instanceof RateLimitError
        ? e.retryAfter
        : base * Math.pow(2, i) + Math.random() * 200;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw err;
}

class RateLimitError extends Error {
  constructor(message, retryAfter) {
    super(message);
    this.retryAfter = retryAfter;
  }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
