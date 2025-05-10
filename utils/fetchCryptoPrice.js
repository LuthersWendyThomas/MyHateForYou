import fetch from "node-fetch";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = {};

// ✅ Supported currency mapping (used by APIs)
const SUPPORTED = {
  btc: "bitcoin",
  eth: "ethereum",
  matic: "polygon",
  sol: "solana"
};

/**
 * ✅ Public API — returns EUR price for selected crypto
 * @param {string} currency - e.g., "btc", "eth", etc.
 * @returns {number|null}
 */
export async function fetchCryptoPrice(currency) {
  if (!currency) return null;

  const clean = String(currency).trim().toLowerCase();
  const mapped = SUPPORTED[clean];
  if (!mapped) {
    console.warn(`⚠️ Nepalaikoma valiuta: ${currency}`);
    return null;
  }

  const now = Date.now();
  const cached = cache[clean];
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.rate;
  }

  // --- CoinGecko su retry bandymais
  try {
    const price = await fetchFromCoinGecko(mapped);
    if (price) {
      saveToCache(clean, price);
      return price;
    }
  } catch (err) {
    console.warn(`⚠️ [CoinGecko klaida]: ${err.message}`);
  }

  // --- CoinCap fallback
  try {
    const price = await fetchFromCoinCap(mapped);
    if (price) {
      saveToCache(clean, price);
      return price;
    }
  } catch (err) {
    console.warn(`⚠️ [CoinCap klaida]: ${err.message}`);
  }

  return null;
}

/**
 * 🔁 CoinGecko with retry logic (3x), returns EUR price
 */
async function fetchFromCoinGecko(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur`;

  for (let i = 0; i < 3; i++) {
    try {
      if (i > 0) await wait(i * 800); // Incremental delay on retry
      const res = await fetch(url, {
        headers: { Accept: "application/json" }
      });

      if (res.status === 429) {
        console.warn("⏳ CoinGecko rate limited — retrying...");
        continue;
      }

      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
      const json = await res.json();
      const price = parseFloat(json?.[id]?.eur);

      if (Number.isFinite(price) && price > 0) return +price.toFixed(2);
    } catch (e) {
      console.warn(`❌ [CoinGecko retry error]: ${e.message}`);
    }
  }

  return null;
}

/**
 * 📉 CoinCap fallback, returns EUR (converted from USD)
 */
async function fetchFromCoinCap(id) {
  const url = `https://api.coincap.io/v2/assets/${id}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  if (!res.ok) throw new Error(`CoinCap HTTP ${res.status}`);
  const json = await res.json();

  const usd = parseFloat(json?.data?.priceUsd);
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error("CoinCap returned invalid USD price");
  }

  const eurRate = 1.07; // Static conversion rate — could be dynamic
  return +(usd / eurRate).toFixed(2);
}

/**
 * 💾 Cache setter
 */
function saveToCache(currency, rate) {
  cache[currency] = { rate, timestamp: Date.now() };

  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(`💰 Cached rate: ${currency.toUpperCase()} → ${rate}€`);
  }
}

/**
 * ⏳ Wait helper
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
