// 📦 utils/qrScenarios.js | FINAL IMMORTAL v3.0.0•GODMODE•SCENARIOLOCKED•SOURCEOFTRUTH

import { products } from "../config/products.js";
import { deliveryMethods } from "../config/features.js";
import { NETWORKS } from "../config/networkConfig.js"; // Imported NETWORKS from config
import { fetchCryptoPrice } from "./fetchCryptoPrice.js";
import {
  sanitizeAmount, 
  getAmountFilename, 
  normalizeSymbol // Added normalizeSymbol here
} from "./fallbackPathUtils.js"; // All necessary helpers are imported

/**
 * ⛓️ Gauk visus gyvus kripto kursus 1 kartą ir išsaugok map'e
 */
export async function getLiveRatesMap() {
  const map = {};
  const networks = Object.keys(NETWORKS); // Using NETWORKS for all network symbols
  for (const sym of networks) {
    try {
      const rate = await fetchCryptoPrice(sym);
      if (!rate || rate <= 0) throw new Error(`❌ Invalid rate: ${rate}`);
      map[sym] = rate;
    } catch (err) {
      console.warn(`⚠️ [getLiveRatesMap] ${sym} → ${err.message}`);
    }
  }
  return map;
}

/**
 * 🎯 Grąžina visas galimas QR scenarijų kombinacijas su realiais kursais ir amounts
 * Tai vienintelis tiesos šaltinis visai sistemai (generate + validate + check).
 */
export async function getAllQrScenarios() {
  const result = [];

  const deliveryFees = deliveryMethods.map(method => Number(method.fee));
  const networks = Object.keys(NETWORKS); // Using NETWORKS for network keys
  const rateMap = await getLiveRatesMap();

  for (const category in products) {
    for (const product of products[category]) {
      if (!product?.active || !product?.prices) continue;

      for (const [quantity, basePrice] of Object.entries(product.prices)) {
        const usd = Number(basePrice);
        if (!usd || usd <= 0) continue;

        for (const fee of deliveryFees) {
          const totalUSD = usd + fee;

          for (const rawSymbol of networks) {
            const rate = rateMap[rawSymbol];
            if (!rate || rate <= 0) continue;

            // Use sanitizeAmount for rounding the calculated amount
            const expectedAmount = sanitizeAmount(totalUSD / rate);
            const filename = getAmountFilename(rawSymbol, expectedAmount);

            result.push({
              category,
              productName: product.name,
              quantity,
              basePrice: usd,
              deliveryFee: fee,
              totalUSD,
              rawSymbol,
              mockRate: rate,
              expectedAmount,
              filename
            });
          }
        }
      }
    }
  }

  return result;
}

/**
 * 📈 Skaičiuoja kiek iš viso QR kombinacijų sistema turi turėti.
 * Naudoti validate/generate palyginimams ar admin pranešimams.
 */
export async function getExpectedQrCount() {
  const scenarios = await getAllQrScenarios();
  return scenarios.length;
}

/**
 * 💵 Normalize and sanitize amount 
 * Added helper function to ensure proper amount formatting and rounding
 */
function sanitizeAmount(input) {
  try {
    const val = Number(input);
    if (!Number.isFinite(val) || val <= 0) return 0;
    const rounded = Math.floor(val * 1e6) / 1e6;
    return +rounded.toFixed(6);
  } catch {
    return 0;
  }
}

/**
 * 🔐 Normalize currency symbol (e.g., eth → ETH)
 * We ensure that all network symbols are normalized to upper case
 */
function normalizeSymbol(raw) {
  try {
    const key = String(raw || "").trim().toLowerCase();
    return (NETWORKS[key] || key).toUpperCase();
  } catch {
    return "UNKNOWN";
  }
}

/**
 * 💾 Standard fallback filename for scenario
 * Added filename creation with network symbol and amount
 */
function getAmountFilename(symbol, amount) {
  const sym = normalizeSymbol(symbol);
  const amt = sanitizeAmount(amount);
  return `${sym}_${amt.toFixed(6)}.png`;
}
