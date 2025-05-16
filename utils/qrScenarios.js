// 📦 utils/qrScenarios.js | FINAL IMMORTAL v3.0.0•GODMODE•SCENARIOLOCKED•SOURCEOFTRUTH

import { products } from "../config/products.js";
import { deliveryMethods } from "../config/features.js";
import { NETWORKS } from "./fetchCryptoPrice.js";
import { fetchCryptoPrice } from "./fetchCryptoPrice.js";
import { sanitizeAmount, getAmountFilename } from "./fallbackPathUtils.js";

/**
 * ⛓️ Gauk visus gyvus kripto kursus 1 kartą ir išsaugok map'e
 */
export async function getLiveRatesMap() {
  const map = {};
  const symbols = Object.keys(NETWORKS);
  for (const sym of symbols) {
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
  const networks = Object.keys(NETWORKS);
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
