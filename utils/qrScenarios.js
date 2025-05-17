// 📦 utils/qrScenarios.js | GODMODE IMMORTAL FINAL v999999999999x • PLAN-C EXPORT SYNC

import path from "path";
import { products } from "../config/products.js";
import { deliveryMethods } from "../config/features.js";
import { fetchCryptoPrice, NETWORKS } from "./fetchCryptoPrice.js";

import {
  sanitizeAmount,
  normalizeSymbol,
  FALLBACK_DIR
} from "./fallbackPathUtils.js"; // ✅ Vieningas kelias

/**
 * 🔁 Gauna visų aktyvių tinklų (BTC, ETH, MATIC, SOL) kursus
 */
export async function getLiveRatesMap() {
  const map = {};
  const networks = Object.keys(NETWORKS);

  for (const rawSym of networks) {
    const symbol = normalizeSymbol(rawSym);
    try {
      const rate = await fetchCryptoPrice(symbol);
      if (!rate || rate <= 0) throw new Error(`Invalid rate: ${rate}`);
      map[symbol] = rate;
    } catch (err) {
      console.warn(`⚠️ [getLiveRatesMap] ${symbol} failed: ${err.message}`);
      map[symbol] = null;
    }
  }

  return map;
}

/**
 * 🎯 Sugeneruoja VISUS PLAN-C fallback QR scenarijus
 */
export async function getAllQrScenarios() {
  const scenarios = [];
  const rateMap = await getLiveRatesMap();

  for (const category in products) {
    for (const product of products[category]) {
      if (!product?.active || !product?.prices) continue;

      for (const [quantity, baseUSD] of Object.entries(product.prices)) {
        const base = Number(baseUSD);
        if (!base || base <= 0) continue;

        for (const { fee } of deliveryMethods) {
          const totalUSD = base + fee;

          for (const network of Object.keys(rateMap)) {
            const rate = rateMap[network];
            if (!rate || rate <= 0) continue;

            const expectedAmount = sanitizeAmount(totalUSD / rate);
            const sym = normalizeSymbol(network);
            const amt = expectedAmount.toFixed(6);
            const filename = `${sym}_${amt}__${category}__${product.name}__${quantity}.png`;

            scenarios.push({
              category,
              productName: product.name,
              quantity,
              basePrice: base,
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

  return scenarios;
}

/**
 * 📦 Grąžina pilną absoliutų scenarijaus fallback failo kelią
 */
export function getScenarioPath(scenario) {
  return path.join(FALLBACK_DIR, scenario.filename);
}

/**
 * 📊 Grąžina kiek fallback QR failų tikimasi
 */
export async function getExpectedQrCount() {
  const all = await getAllQrScenarios();
  return all.length;
}

// ✅ Eksportuojamas bendras fallback katalogo kelias
export { FALLBACK_DIR };
