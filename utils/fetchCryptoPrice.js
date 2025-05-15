// 📦 utils/fetchCryptoPrice.js | IMMORTAL FINAL v3.1.9•DIAMONDLOCK+ULTRAFAST+QRFALLBACKSAFE
import fetch from 'node-fetch';
import { rateLimiter } from './rateLimiter.js';
import { ALIASES }     from '../config/config.js';

const CACHE_TTL       = 5 * 60 * 1000;
const MICRO_FALLBACK  = 30 * 1000;
const REQUEST_TIMEOUT = 10000;

const cache = new Map(); // <symbol, { rate, ts }>
const locks = new Map(); // <symbol, Promise<number>>

export const NETWORKS = {
  BTC: {
    coinGecko: {
      buildUrls: [() =>
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'],
      extract: d => Number(d.bitcoin?.usd)
    },
    coinCap: {
      buildUrls: [() =>
        'https://api.coincap.io/v2/assets/bitcoin'],
      extract: d => Number(d.data?.priceUsd)
    }
  },
  ETH: {
    coinGecko: {
      buildUrls: [() =>
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'],
      extract: d => Number(d.ethereum?.usd)
    },
    coinCap: {
      buildUrls: [() =>
        'https://api.coincap.io/v2/assets/ethereum'],
      extract: d => Number(d.data?.priceUsd)
    }
  },
  MATIC: {
    coinGecko: {
      buildUrls: [
        () => 'https://api.coingecko.com/api/v3/simple/price?ids=polygon&vs_currencies=usd',
        () => 'https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd'
      ],
      extract: d => Number(d.polygon?.usd ?? d['matic-network']?.usd)
    },
    coinCap: {
      buildUrls: [() =>
        'https://api.coincap.io/v2/assets/polygon'],
      extract: d => Number(d.data?.priceUsd)
    }
  },
  SOL: {
    coinGecko: {
      buildUrls: [() =>
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'],
      extract: d => Number(d.solana?.usd)
    },
    coinCap: {
      buildUrls: [() =>
        'https://api.coincap.io/v2/assets/solana'],
      extract: d => Number(d.data?.priceUsd)
    }
  }
};

class RateLimitError extends Error {
  constructor(msg, ms) {
    super(msg);
    this.retryAfterMs = ms;
  }
}

export async function fetchCryptoPrice(rawSymbol) {
  const sym = normalize(rawSymbol);
  const cfg = NETWORKS[sym];
  if (!cfg) {
    console.warn(`⚠️ Unsupported currency: "${rawSymbol}"`);
    return null;
  }

  await rateLimiter(sym);

  if (locks.has(sym)) return locks.get(sym);
  const task = fetchAndCache(sym, cfg);
  locks.set(sym, task);
  try {
    return await task;
  } finally {
    locks.delete(sym);
  }
}

async function fetchAndCache(sym, providers) {
  const now = Date.now();
  const hit = cache.get(sym);
  if (hit && now - hit.ts < CACHE_TTL) return hit.rate;

  const { coinGecko, coinCap } = providers;
  let err;

  for (const [name, provider] of [['CoinGecko', coinGecko], ['CoinCap', coinCap]]) {
    try {
      const rate = await retry(() => tryUrls(provider, name));
      if (rate > 0) {
        cache.set(sym, { rate, ts: Date.now() });
        return rate;
      }
    } catch (e) {
      err = e;
      console.warn(`⚠️ [${sym} → ${name}] ${e.message}`);
    }
  }

  const fallback = cache.get(sym);
  if (fallback && now - fallback.ts < MICRO_FALLBACK) {
    console.warn(`⏪ Using recent fallback for ${sym}`);
    return fallback.rate;
  }

  const reason = Array.isArray(err?.errors)
    ? err.errors.map(e => e?.message).join(' | ')
    : err?.message || 'Unknown error';

  throw new Error(`❌ All providers failed for "${sym}": ${reason}`);
}

async function tryUrls(provider, name) {
  const urls = provider.buildUrls || [];
  for (const fn of urls) {
    const url = fn();
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: ctrl.signal
      });

      clearTimeout(tid);

      if (res.status === 429) {
        const ra = parseRetryAfter(res.headers.get("Retry-After"));
        throw new RateLimitError("429 Too Many Requests", ra);
      }
      if (!res.ok) continue;

      const json = await res.json();
      const value = provider.extract(json);
      if (isValid(value)) return +value.toFixed(2);
    } catch (err) {
      clearTimeout(tid);
      if (err.name === "AbortError") throw new Error("Timeout");
      throw err;
    }
  }

  throw new Error(`❌ All URLs failed for provider ${name}`);
}

async function retry(fn, retries = 3, base = 300) {
  let err;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      err = e;
      const delay = e instanceof RateLimitError
        ? e.retryAfterMs
        : base * 2 ** i + Math.random() * 150;
      await new Promise(res => setTimeout(res, delay + 300)); // 🔁 Add buffer delay to avoid cascading
    }
  }
  throw err;
}

function normalize(raw) {
  const key = raw.trim().toLowerCase();
  return (ALIASES[key] || key).toUpperCase();
}

function parseRetryAfter(h) {
  const s = parseInt(h, 10);
  return Number.isFinite(s) && s > 0 ? s * 1000 : 1000;
}

function isValid(n) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}
