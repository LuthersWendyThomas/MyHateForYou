// utils/fetchCryptoPrice.js | IMMORTAL FINAL v3.1.0•GODMODE DIAMONDLOCK
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
 * Each symbol gets two providers. For MATIC, CoinGecko will
 * try both 'polygon' and then 'matic-network' slugs.
 */
export const NETWORKS = {
  BTC: {
    coinGecko: {
      buildUrls: [() =>
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
      ],
      extract: data => Number(data.bitcoin?.usd)
    },
    coinCap: {
      buildUrls: [() =>
        'https://api.coincap.io/v2/assets/bitcoin'
      ],
      extract: data => Number(data.data?.priceUsd)
    }
  },
  ETH: {
    coinGecko: {
      buildUrls: [() =>
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
      ],
      extract: data => Number(data.ethereum?.usd)
    },
    coinCap: {
      buildUrls: [() =>
        'https://api.coincap.io/v2/assets/ethereum'
      ],
      extract: data => Number(data.data?.priceUsd)
    }
  },
  MATIC: {
    coinGecko: {
      // try both known slugs so we never miss MATIC
      buildUrls: [
        () => 'https://api.coingecko.com/api/v3/simple/price?ids=polygon&vs_currencies=usd',
        () => 'https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd'
      ],
      extract: data =>
        // pick whichever one exists
        Number(data.polygon?.usd ?? data['matic-network']?.usd)
    },
    coinCap: {
      buildUrls: [() =>
        'https://api.coincap.io/v2/assets/polygon'
      ],
      extract: data => Number(data.data?.priceUsd)
    }
  },
  SOL: {
    coinGecko: {
      buildUrls: [() =>
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
      ],
      extract: data => Number(data.solana?.usd)
    },
    coinCap: {
      buildUrls: [() =>
        'https://api.coincap.io/v2/assets/solana'
      ],
      extract: data => Number(data.data?.priceUsd)
    }
  }
  // …extend here for more symbols
};

class RateLimitError extends Error {
  constructor(msg, retryAfterMs) {
    super(msg);
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Fetch USD price for rawSymbol (alias-aware).
 * Returns rounded number or null on fatal.
 */
export async function fetchCryptoPrice(rawSymbol) {
  if (!rawSymbol) return null;

  const sym = normalize(rawSymbol);
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
  const job = fetchAndCache(sym, cfg);
  locks.set(sym, job);
  try {
    return await job;
  } finally {
    locks.delete(sym);
  }
}

/** check cache, then try providers in order */
async function fetchAndCache(sym, { coinGecko, coinCap }) {
  const now = Date.now();
  const hit = cache.get(sym);
  if (hit && now - hit.ts < CACHE_TTL) {
    return hit.rate;
  }

  let lastErr;
  for (const [name, provider] of [['CoinGecko', coinGecko], ['CoinCap', coinCap]]) {
    try {
      const rate = await fetchWithRetry(() => doFetch(provider, name));
      if (rate > 0) {
        cache.set(sym, { rate, ts: Date.now() });
        return rate;
      }
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️ [${sym} → ${name}] ${err.message}`);
    }
  }

  throw new Error(`❌ All providers failed for "${sym}": ${lastErr?.message}`);
}

/**
 * Try one provider’s URLs in sequence, with timeout + extraction.
 */
async function doFetch(provider, name) {
  const urls = Array.isArray(provider.buildUrls)
    ? provider.buildUrls
    : [provider.buildUrls];

  for (const buildFn of urls) {
    const url = buildFn();
    if (process.env.DEBUG_MESSAGES === 'true') {
      console.debug(`[fetch][${name}] GET ${url}`);
    }

    // timeout guard
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);

    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': 'Node.js' }, signal: ctrl.signal });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw err;
    } finally {
      clearTimeout(tid);
    }

    if (res.status === 429) {
      const ra = parseRetryAfter(res.headers.get('Retry-After'));
      throw new RateLimitError('429 Too Many Requests', ra);
    }
    if (!res.ok) {
      // try next URL (for matic fallback) or get caught in retry
      continue;
    }

    const json = await res.json();
    const val  = provider.extract(json);
    if (isValid(val)) {
      return +val.toFixed(2);
    }
    // if extract failed (NaN/zero), try next URL/extract
  }

  throw new Error(`All URLs failed for provider ${name}`);
}

/** retry w/ exponential backoff + handle RateLimitError */
async function fetchWithRetry(fn, retries = 3, base = 500) {
  let err;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      err = e;
      const delay = e instanceof RateLimitError
        ? e.retryAfterMs
        : base * 2 ** i + Math.random() * 200;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw err;
}

function normalize(raw) {
  const k = raw.trim().toLowerCase();
  return (ALIASES[k] || k).toUpperCase();
}

function parseRetryAfter(h) {
  const s = parseInt(h, 10);
  return Number.isFinite(s) && s > 0 ? s * 1000 : 1000;
}

function isValid(n) {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}
