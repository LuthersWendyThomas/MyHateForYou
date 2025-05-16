// 📦 utils/qrScenarios.js | FINAL IMMORTAL v3.0.0•GODMODE•SCENARIOLOCKED•SOURCEOFTRUTH

import { ALIASES, WALLETS } from "../config/config.js"; // Importuojame ALIASES ir WALLETS iš config.js
import { fetchCryptoPrice } from "./fetchCryptoPrice.js"; // Naudokime fetchCryptoPrice duomenims gauti
import { sanitizeAmount, getAmountFilename, normalizeSymbol } from "./fallbackPathUtils.js"; // Helperiai

/**
 * ⛓️ Gauk visus gyvus kripto kursus 1 kartą ir išsaugok map'e
 */
export async function getLiveRatesMap() {
  const map = {};
  const networks = Object.keys(ALIASES); // Using ALIASES for all network symbols
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
  const rateMap = await getLiveRatesMap(); // Gausime kursus tik čia

  // Iteruojame per produktus ir apskaičiuojame scenarijus
  for (const category in products) {
    for (const product of products[category]) {
      if (!product?.active || !product?.prices) continue;

      for (const [quantity, basePrice] of Object.entries(product.prices)) {
        const usd = Number(basePrice);
        if (!usd || usd <= 0) continue;

        // Apskaičiuojame visus scenarijus su įvairiais mokesčiais
        for (const fee of deliveryFees) {
          const totalUSD = usd + fee;

          for (const rawSymbol of Object.keys(rateMap)) {
            const rate = rateMap[rawSymbol];
            if (!rate || rate <= 0) continue;

            // Skaičiuojame kiek reikės kriptovaliutos už visą sumą
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
