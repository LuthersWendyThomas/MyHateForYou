import fetch from "node-fetch";

const CACHE_TTL = 5 * 60 * 1000;
const cache = {};

// 🔐 ID mapping: Gecko + CoinCap
const SUPPORTED = {
  btc: { gecko: "bitcoin",      coincap: "bitcoin" },
  eth: { gecko: "ethereum",     coincap: "ethereum" },
  matic: { gecko: "polygon", coincap: "polygon" },
  sol: { gecko: "solana",       coincap: "solana" }
};

/**
 * ✅ Grąžina EUR kainą pagal valiutą
 */
export async function fetchCryptoPrice(currency) {
  if (!currency) return null;

  const clean = String(currency).trim().toLowerCase();
  const ids = SUPPORTED[clean];
  if (!ids) {
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

  // ⬆️ Pirmiausia CoinGecko
  try {
    const rate = await fetchFromCoinGecko(ids.gecko);
    if (rate) return saveToCache(clean, rate);
  } catch (err) {
    console.warn(`⚠️ [CoinGecko klaida → ${clean}]: ${err.message}`);
  }

  // ⬇️ CoinCap fallback
  try {
    const rate = await fetchFromCoinCap(ids.coincap);
    if (rate) return saveToCache(clean, rate);
  } catch (err) {
    console.warn(`⚠️ [CoinCap klaida → ${clean}]: ${err.message}`);
  }

  return null;
}

/**
 * 🔁 CoinGecko su retry (3 kartai, 1s+ delay)
 */
async function fetchFromCoinGecko(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur`;

  for (let i = 0; i < 3; i++) {
    try {
      if (i > 0) await wait(i * 1000); // delay: 1s, 2s...
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
 * 📉 CoinCap fallback → USD → EUR
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
 * 💾 Įrašo kursą į cache
 */
function saveToCache(currency, rate) {
  cache[currency] = { rate, timestamp: Date.now() };
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(`💰 [CACHE] ${currency.toUpperCase()} → ${rate}€`);
  }
  return rate;
}

/**
 * ⏳ Async delay (naudojama retry sistemai)
 */
function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}
