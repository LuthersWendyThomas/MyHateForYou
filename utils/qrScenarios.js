// 📦 utils/qrScenarios.js
import { products } from "../config/products.js";
import { deliveryMethods } from "../config/features.js";
import { NETWORKS } from "./fetchCryptoPrice.js";

export function getAllQrScenarios() {
  const result = [];

  for (const category in products) {
    for (const product of products[category]) {
      if (!product.active || !product.prices) continue;

      for (const [qty, price] of Object.entries(product.prices)) {
        const usd = Number(price);
        if (!usd || usd <= 0) continue;

        for (const method of deliveryMethods) {
          const totalUSD = usd + method.fee;

          for (const symbol of Object.keys(NETWORKS)) {
            result.push({
              rawSymbol: symbol,
              normalized: symbol.toLowerCase(),
              totalUSD,
            });
          }
        }
      }
    }
  }

  return result;
}
