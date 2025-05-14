// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v5.0.0•GODMODE•GENERATOR-DRIVEN•520x-AUTO
// QR AUTO-PREHEAT ENGINE • 520x VARIATION COVERAGE • SYNCED WITH generateQR()

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateQR } from "./generateQR.js";
import { products } from "../config/products.js";
import { deliveryMethods } from "../config/features.js";
import { sanitizeAmount } from "./fallbackPathUtils.js";
import { NETWORKS } from "./fetchCryptoPrice.js";
import { fetchCryptoPrice } from "./fetchCryptoPrice.js";
import { rateLimiter } from "./rateLimiter.js";

/**
 * 📁 Ensure fallback dir exists
 */
export async function initQrCacheDir() {
  const dir = "qr-cache";
  if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true });
}

/**
 * 🧼 Delete all PNGs from cache
 */
export async function cleanQrCacheDir() {
  try {
    const files = await fs.readdir("qr-cache");
    const targets = files.filter(f => f.endsWith(".png"));
    for (const f of targets) await fs.unlink(path.join("qr-cache", f));
    console.log(`🧹 [cleanQrCacheDir] Deleted ${targets.length} old PNGs.`);
  } catch (err) {
    console.warn("⚠️ [cleanQrCacheDir]", err.message);
  }
}

/**
 * ♻️ Full QR preheater for 520x scenarios
 */
export async function generateFullQrCache() {
  await initQrCacheDir();

  const skipped = [];
  const deliveryFees = deliveryMethods.map(m => Number(m.fee));
  const symbols = Object.keys(NETWORKS);
  const seenAmounts = new Set();

  let total = 0;
  let done = 0;

  for (const category in products) {
    for (const product of products[category]) {
      const prices = product.prices || {};
      for (const [qty, price] of Object.entries(prices)) {
        const usd = Number(price);
        if (!usd || usd <= 0) continue;

        for (const fee of deliveryFees) {
          const totalUSD = usd + fee;

          for (const symbol of symbols) {
            total++;

            try {
              await rateLimiter(symbol);
              const rate = await fetchCryptoPrice(symbol);
              if (!rate || rate <= 0) throw new Error("Invalid rate");

              const amount = sanitizeAmount(totalUSD / rate);
              const key = `${symbol}_${amount}`;
              if (seenAmounts.has(key)) {
                done++;
                continue;
              }

              const buffer = await generateQR(symbol, amount);
              if (buffer && Buffer.isBuffer(buffer) && buffer.length > 1000) {
                seenAmounts.add(key);
                done++;
                console.log(`✅ [QR Fallback] ${symbol} $${totalUSD} → ${amount.toFixed(6)} (${done}/${total})`);
              } else {
                throw new Error("QR generation failed");
              }

            } catch (err) {
              skipped.push({ symbol, totalUSD });
              console.warn(`⚠️ [QR Skip] ${symbol} $${totalUSD} → ${err.message}`);
            }
          }
        }
      }
    }
  }

  // Final retry pass for skips
  if (skipped.length > 0) {
    console.log(`🔁 Retrying ${skipped.length} skipped fallbacks...`);
    for (const { symbol, totalUSD } of skipped) {
      try {
        await rateLimiter(symbol);
        const rate = await fetchCryptoPrice(symbol);
        if (!rate || rate <= 0) continue;
        const amount = sanitizeAmount(totalUSD / rate);
        const buffer = await generateQR(symbol, amount);
        if (buffer) {
          console.log(`✅ [QR Retry] ${symbol} $${totalUSD} → ${amount.toFixed(6)}`);
        }
      } catch (err) {
        console.warn(`❌ [Retry Fail] ${symbol} $${totalUSD} → ${err.message}`);
      }
    }
  }

  console.log(`🎯 [generateFullQrCache] Complete: ${done}/${total} fallbacks generated.`);
}

/**
 * 🔁 Hourly refresher trigger
 */
export async function refreshQrCache() {
  console.log("♻️ [refreshQrCache] Started...");
  await generateFullQrCache();
}
