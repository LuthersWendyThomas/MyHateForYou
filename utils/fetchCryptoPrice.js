// 📦 utils/fetchCryptoPrice.js | IMMORTAL FINAL v100000000 — MATIC+SYNC+LOCKED

import fetch from "node-fetch";

const CACHE_TTL = 5 * 60 * 1000;
const cache = {};

// ✅ CoinGecko / CoinCap naudojami ID
const SUPPORTED = {
  btc: "bitcoin",
  eth: "ethereum",
  matic: "polygon", // CoinGecko ir CoinCap priima "polygon"
  sol: "solana"
};

/**
 * 🔄 Gauk kriptovaliutos EUR kursą
 */
export async function fetchCryptoPrice(currency) {
  if (!currency) return null;

  const clean = String(currency).trim().toLowerCase();
  const id = SUPPORTED[clean];

  if (!id) {
    console.warn(`⚠️ Nepalaikoma valiuta: "${currency}"`);
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

  // ⬆️ Pirmiausia bandom CoinGecko
  try {
    const rate = await fetchFromCoinGecko(id);
    if (rate) return saveToCache(clean, rate);
  } catch (err) {
    console.warn(`⚠️ [CoinGecko klaida → ${clean}]: ${err.message}`);
  }

  // ⬇️ Fallback į CoinCap
  try {
    const rate = await fetchFromCoinCap(id);
    if (rate) return saveToCache(clean, rate);
  } catch (err) {
    console.warn(`⚠️ [CoinCap klaida → ${clean}]: ${err.message}`);
  }

  return null;
}

/**
 * 🔁 CoinGecko retry logika (3 kartai)
 */
async function fetchFromCoinGecko(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur`;

  for (let i = 0; i < 3; i++) {
    try {
      if (i > 0) await wait(i * 1000);
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
 * 📉 CoinCap atsarginis kursas (USD → EUR)
 */
async function fetchFromCoinCap(id) {
  const url = `https://api.coincap.io/v2/assets/${id}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) throw new Error(`CoinCap HTTP ${res.status}`);

  const json = await res.json();
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
 * 💤 Async delay
 */
function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}
