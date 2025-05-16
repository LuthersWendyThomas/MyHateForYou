// 📦 utils/qrScenarios.js | FINAL IMMORTAL v3.0.0•GODMODE•SCENARIOLOCKED•SOURCEOFTRUTH

import { ALIASES, WALLETS } from "../config/config.js"; // Importing ALIASES and WALLETS from config.js
import { fetchCryptoPrice } from "./fetchCryptoPrice.js"; // Use fetchCryptoPrice for rate fetching
import { sanitizeAmount, getAmountFilename, normalizeSymbol } from "./fallbackPathUtils.js"; // Necessary helpers

/**
 * ⛓️ Fetch all live crypto rates once and store them in a map
 */
export async function getLiveRatesMap() {
  const map = {};
  const networks = Object.keys(ALIASES); // Using ALIASES for all network symbols

  // Loop through all network symbols
  for (const sym of networks) {
    const normalizedSymbol = normalizeSymbol(sym); // Normalize symbol to ensure consistency
    try {
      // Try fetching the rate for the normalized symbol
      const rate = await fetchCryptoPrice(normalizedSymbol);

      if (!rate || rate <= 0) {
        throw new Error(`❌ Invalid rate for ${normalizedSymbol}: ${rate}`);
      }
      map[normalizedSymbol] = rate; // Store the valid rate
    } catch (err) {
      console.warn(`⚠️ [getLiveRatesMap] Error fetching rate for ${normalizedSymbol}: ${err.message}`);
      
      // If the rate fetch failed, we can either skip this symbol or use a fallback approach
      map[normalizedSymbol] = null; // Mark this symbol as unavailable
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
  const rateMap = await getLiveRatesMap(); // Get live rates map (BTC, ETH, MATIC, SOL)

  // Iterate over products and calculate scenarios
  for (const category in products) {
    for (const product of products[category]) {
      if (!product?.active || !product?.prices) continue;

      for (const [quantity, basePrice] of Object.entries(product.prices)) {
        const usd = Number(basePrice);
        if (!usd || usd <= 0) continue;

        // Calculate all possible scenarios with various delivery fees
        for (const fee of deliveryFees) {
          const totalUSD = usd + fee;

          // Iterate over all the networks (BTC, ETH, MATIC, SOL)
          for (const network of Object.keys(rateMap)) {
            const rate = rateMap[network];
            if (!rate || rate <= 0) continue; // Skip if the rate is invalid or unavailable

            // Calculate how much crypto is needed for the total amount
            const expectedAmount = sanitizeAmount(totalUSD / rate);
            const filename = getAmountFilename(network, expectedAmount); // Ensure the filename is unique for each network

            // Push the scenario for the current network
            result.push({
              category,
              productName: product.name,
              quantity,
              basePrice: usd,
              deliveryFee: fee,
              totalUSD,
              rawSymbol: network, // Set the correct network symbol (BTC, ETH, MATIC, SOL)
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
 * 📈 Get the expected count of all QR scenarios the system should have.
 * Used for validation/generation comparison and admin reporting
 */
export async function getExpectedQrCount() {
  const scenarios = await getAllQrScenarios();
  return scenarios.length;
}
