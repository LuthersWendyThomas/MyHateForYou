// utils/fetchCryptoPrice.js | IMMORTAL FINAL v3.0.1•GODMODE DIAMONDLOCK
// RATE-LIMITED • CONCURRENCY LOCK • CACHE (5 min) • USD-ONLY • BULLETPROOF

import fetch from 'node-fetch';
import { rateLimiter } from './rateLimiter.js';
import { ALIASES }     from '../config/config.js';

const CACHE_TTL       = 5 * 60 * 1000;  // 5 minutes
const REQUEST_TIMEOUT = 10 * 1000;      // 10 seconds

// in-memory cache & locks
const cache = new Map();  // Map<symbol, { rate: number, ts: number }>
const locks = new Map();  // Map<symbol, Promise<number>>

/**
 * Hard-coded network configs: each symbol has CoinGecko & CoinCap endpoints.
 * Add new symbols here and you’re done.
 */
export const NETWORKS = {
  BTC: {
    coinGecko: {
      buildUrl: () =>
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      extract: data => Number(data.bitcoin?.usd)
    },
    coinCap: {
      buildUrl: () =>
        'https://api.coincap.io/v2/assets/bitcoin',
      extract: data => Number(data.data?.priceUsd)
    }
  },
  ETH: {
    coinGecko: {
      // FIXED: use Ethereum slug, not polygon
      buildUrl: () =>
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      extract: data => Number(data.ethereum?.usd)
    },
    coinCap: {
      buildUrl: () =>
        'https://api.coincap.io/v2/assets/ethereum',
      extract: data => Number(data.data?.priceUsd)
    }
  },
  MATIC: {
    coinGecko: {
      // native MATIC on Polygon chain
      buildUrl: () =>
        'https://api.coingecko.com/api/v3/simple/price?ids=polygon&vs_currencies=usd',
      extract: data => Number(data.polygon?.usd)
    },
    coinCap: {
      buildUrl: () =>
        'https://api.coincap.io/v2/assets/polygon',
      extract: data => Number(data.data?.priceUsd)
    }
  },
  SOL: {
    coinGecko: {
      buildUrl: () =>
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      extract: data => Number(data.solana?.usd)
    },
    coinCap: {
      buildUrl: () =>
        'https://api.coincap.io/v2/assets/solana',
      extract: data => Number(data.data?.priceUsd)
    }
  }
  // …extend with more symbols as needed
};

class RateLimitError extends Error {
  constructor(msg, retryAfterMs) {
    super(msg);
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Fetch USD price for a symbol (alias-aware).
 * Returns rounded number or null on fatal error.
 */
export async function fetchCryptoPrice(rawSymbol) {
  if (!rawSymbol) return null;

  // normalize & lookup
  const sym = normalizeSymbol(rawSymbol);
  const cfg = NETWORKS[sym];
  if (!cfg) {
    console.warn(`⚠️ Unsupported currency: "${rawSymbol}"`);
    return null;
  }

  // rate-limit per symbol
  await rateLimiter(sym);

  // concurrency lock
  if (locks.has(sym)) {
    return locks.get(sym);
  }
  const promise = fetchAndCache(sym, cfg);
  locks.set(sym, promise);
  try {
    return await promise;
  } finally {
    locks.delete(sym);
  }
}

/** cache check → try CoinGecko then CoinCap → cache result */
async function fetchAndCache(sym, { coinGecko, coinCap }) {
  const now = Date.now();
  const hit = cache.get(sym);
  if (hit && now - hit.ts < CACHE_TTL) {
    return hit.rate;
  }

  let lastErr;
  for (const provider of [coinGecko, coinCap]) {
    try {
      const rate = await fetchWithRetry(() => doFetch(provider));
      if (rate > 0) {
        cache.set(sym, { rate, ts: Date.now() });
        return rate;
      }
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️ [${sym} → ${provider === coinGecko ? 'CoinGecko' : 'CoinCap'}] ${err.message}`);
    }
  }

  throw new Error(`❌ All providers failed for "${sym}": ${lastErr?.message}`);
}

/** single HTTP fetch + JSON parse + extract + validate */
async function doFetch({ buildUrl, extract }) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let res;
  try {
    res = await fetch(buildUrl(), {
      headers: { 'User-Agent': 'Node.js' },
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timeout');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 429) {
    const ra = parseRetryAfter(res.headers.get('Retry-After'));
    throw new RateLimitError('429 Too Many Requests', ra);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  const val  = extract(data);
  if (!isValidNumber(val)) {
    throw new Error('Invalid response payload');
  }
  return +val.toFixed(2);
}

/** exponential backoff + jitter; handles RateLimitError */
async function fetchWithRetry(fn, retries = 3, baseDelay = 500) {
  let err;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      err = e;
      const delay = e instanceof RateLimitError
        ? e.retryAfterMs
        : baseDelay * 2 ** i + Math.random() * 200;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw err;
}

function normalizeSymbol(raw) {
  const key = raw.trim().toLowerCase();
  return (ALIASES[key] || key).toUpperCase();
}

function parseRetryAfter(header) {
  const sec = parseInt(header, 10);
  return Number.isFinite(sec) && sec > 0 ? sec * 1000 : 1000;
}

function isValidNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}
