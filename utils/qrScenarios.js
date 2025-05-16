// 📦 utils/qrScenarios.js | IMMORTAL FINAL v1.0.999999x•GODMODE•SOURCEOFTRUTH•SYNCED

import { products } from "../config/products.js";
import { deliveryMethods } from "../config/features.js";
import { NETWORKS } from "./fetchCryptoPrice.js";

/**
 * 🎯 Grąžina visas galimas unikalias QR scenarijų kombinacijas.
 * Tai vienintelis tiesos šaltinis visai sistemai (generate + validate + check).
 */
export function getAllQrScenarios() {
  const result = [];

  const deliveryFees = deliveryMethods.map(method => Number(method.fee));
  const networks = Object.keys(NETWORKS);

  for (const category in products) {
    for (const product of products[category]) {
      if (!product?.active || !product?.prices) continue;

      for (const [quantity, basePrice] of Object.entries(product.prices)) {
        const usd = Number(basePrice);
        if (!usd || usd <= 0) continue;

        for (const fee of deliveryFees) {
          const totalUSD = usd + fee;

          for (const rawSymbol of networks) {
            result.push({
              category,                   // 🌿 Cannabis, ❄️ Cocaine, etc.
              productName: product.name, // 🔥 Zaza (Exotic Indoor), etc.
              quantity,                  // "3.5g", "1pc", etc.
              basePrice: usd,            // original product price
              deliveryFee: fee,          // 5 or 10
              totalUSD,                  // full total
              rawSymbol                  // BTC, ETH, MATIC, SOL
            });
          }
        }
      }
    }
  }

  return result;
}

/**
 * 📈 Skaičiuoja kiek iš viso QR kombinacijų yra sistema turi turėti.
 * Naudoti validate/generate palyginimams.
 */
export function getExpectedQrCount() {
  return getAllQrScenarios().length;
}
