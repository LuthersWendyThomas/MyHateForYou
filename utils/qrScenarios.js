// 📦 utils/qrScenarios.js | FINAL IMMORTAL v3.0.1•GODMODE•SOURCEOFTRUTH+++

import { products } from "../config/products.js"; // All products with active flags and prices
import { deliveryMethods } from "../config/features.js"; // Delivery fees per method
import { fetchCryptoPrice, NETWORKS } from "./fetchCryptoPrice.js"; // Live rate fetching for each network

// Core helpers for fallback filenames, normalization, sanitation
import {
  sanitizeAmount,
  getFallbackPath,
  FALLBACK_DIR,
  normalizeSymbol,
  getAmountFilename
} from "./fallbackPathUtils.js";

/**
 * ⛓️ Fetch all live crypto rates once and store them in a map
 * Ensures one request per network with full normalization
 */
export async function getLiveRatesMap() {
  const map = {};
  const networks = Object.keys(NETWORKS);

  for (const sym of networks) {
    const normalizedSymbol = normalizeSymbol(sym);
    try {
      const rate = await fetchCryptoPrice(normalizedSymbol);
      if (!rate || rate <= 0) throw new Error(`Invalid rate for ${normalizedSymbol}: ${rate}`);
      map[normalizedSymbol] = rate;
    } catch (err) {
      console.warn(`⚠️ [getLiveRatesMap] Failed for ${normalizedSymbol}: ${err.message}`);
      map[normalizedSymbol] = null;
    }
  }

  return map;
}

/**
 * 🎯 Return all possible QR fallback scenarios with unique PNG filenames
 * Source of truth: products × quantity × delivery fee × network
 */
export async function getAllQrScenarios() {
  const result = [];
  const rateMap = await getLiveRatesMap();

  for (const category in products) {
    for (const product of products[category]) {
      if (!product?.active || !product?.prices) continue;

      for (const [quantity, basePrice] of Object.entries(product.prices)) {
        const usd = Number(basePrice);
        if (!usd || usd <= 0) continue;

        for (const { fee } of deliveryMethods) {
          const totalUSD = usd + fee;

          for (const network of Object.keys(rateMap)) {
            const rate = rateMap[network];
            if (!rate || rate <= 0) continue;

            const expectedAmount = sanitizeAmount(totalUSD / rate);
            const filename = getAmountFilename(network, expectedAmount);

            result.push({
              category,
              productName: product.name,
              quantity,
              basePrice: usd,
              deliveryFee: fee,
              totalUSD,
              rawSymbol: network,
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
 * 📈 Count of all QR scenarios to be generated
 * Used in logging, progress bars, admin tools, etc.
 */
export async function getExpectedQrCount() {
  const scenarios = await getAllQrScenarios();
  return scenarios.length;
}
