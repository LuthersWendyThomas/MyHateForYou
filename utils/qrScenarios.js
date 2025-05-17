// 📦 utils/qrScenarios.js | GODMODE IMMORTAL FINAL v999999999999x

import { products } from "../config/products.js"; // 🔗 Produktai su kategorijomis, kiekiais ir USD kainomis
import { deliveryMethods } from "../config/features.js"; // 🚚 Pristatymo metodai su mokestine struktūra
import { fetchCryptoPrice, NETWORKS } from "./fetchCryptoPrice.js"; // 🔄 Kripto kursų paėmimas iš CoinGecko + CoinCap

// 🧩 Būtini helperiai QR fallback logikai
import {
  sanitizeAmount,
  FALLBACK_DIR,
  normalizeSymbol
} from "./fallbackPathUtils.js";

/**
 * 🔁 Gauna visų aktyvių tinklų (BTC, ETH, MATIC, SOL) kursus
 * Kursai sinchronizuojami ir kaupiami į map
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
 * 🎯 Sukuria VISUS fallback QR scenarijus:
 * Produkto kaina + pristatymo kaina → crypto kiekis → QR failo pavadinimas
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
            const filename = getAmountFilename(network, expectedAmount)
              .replace(".png", "") + `__${category}__${product.name}__${quantity}.png`;

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
 * 📊 Kiek fallback QR failų sistema turėtų turėti
 * Naudojama progresui, validacijai ir UI monitoringui
 */
export async function getExpectedQrCount() {
  const all = await getAllQrScenarios();
  return all.length;
}
