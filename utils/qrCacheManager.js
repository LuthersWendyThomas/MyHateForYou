// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v3.3.1•DIAMONDLOCK•MAXSYNC•FILENAME-EXPORTED

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateQR, getFallbackPath } from "./generateQR.js";
import { fetchCryptoPrice, NETWORKS } from "./fetchCryptoPrice.js";
import { products } from "../config/products.js";
import { rateLimiter } from "./rateLimiter.js";

const CACHE_DIR = path.join(process.cwd(), "qr-cache");

/**
 * 💾 Standard fallback filename: SYMBOL_0.123456.png
 */
export function getAmountFilename(symbol, amount) {
  return `${symbol.toUpperCase()}_${Number(amount).toFixed(6)}.png`;
}

/**
 * ✅ Create fallback cache dir
 */
export async function initQrCacheDir() {
  try {
    if (!existsSync(CACHE_DIR)) await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (err) {
    console.error("❌ [initQrCacheDir]", err.message);
  }
}

/**
 * ✅ Get fallback buffer or generate+save it live
 */
export async function getCachedQR(symbol, amount) {
  const filePath = getFallbackPath(symbol, amount);
  try {
    if (existsSync(filePath)) {
      const buffer = await fs.readFile(filePath);
      if (buffer?.length > 1000) return buffer;
    }

    const buffer = await generateQR(symbol, amount);
    if (buffer && buffer.length > 1000) {
      await fs.writeFile(filePath, buffer);
      console.log(`💾 [getCachedQR] Saved: ${path.basename(filePath)}`);
      return buffer;
    }

    throw new Error("QR generation failed.");
  } catch (err) {
    console.error("❌ [getCachedQR]", err.message);
    return null;
  }
}

/**
 * 🧼 Cleanup old fallback PNGs
 */
export async function cleanQrCacheDir() {
  try {
    if (!existsSync(CACHE_DIR)) return;
    const files = await fs.readdir(CACHE_DIR);
    let deleted = 0;
    for (const file of files) {
      if (file.endsWith(".png")) {
        await fs.unlink(path.join(CACHE_DIR, file));
        deleted++;
      }
    }
    console.log(`🧹 [cleanQrCacheDir] Deleted ${deleted} PNGs.`);
  } catch (err) {
    console.warn("⚠️ [cleanQrCacheDir] Failed:", err.message);
  }
}

/**
 * 🔁 Full fallback QR generator — all variants
 */
export async function generateFullQrCache() {
  try {
    await initQrCacheDir();
    await cleanQrCacheDir();

    const deliveryFees = [5, 10]; // Fixed options
    const skipped = [];

    let total = 0;
    let generated = 0;

    for (const category in products) {
      for (const product of products[category]) {
        const { prices = {} } = product;

        for (const [qty, priceUSD] of Object.entries(prices)) {
          const base = Number(priceUSD);
          if (!Number.isFinite(base)) continue;

          for (const deliveryFee of deliveryFees) {
            const totalUSD = base + deliveryFee;

            for (const symbol of Object.keys(NETWORKS)) {
              total++;

              try {
                await rateLimiter(symbol);
                const rate = await fetchCryptoPrice(symbol);
                if (!rate || rate <= 0) throw new Error("Invalid rate");

                const amount = +(totalUSD / rate).toFixed(6);
                const filePath = getFallbackPath(symbol, amount);

                if (!existsSync(filePath)) {
                  const buffer = await generateQR(symbol, amount);
                  if (buffer) {
                    await fs.writeFile(filePath, buffer);
                    generated++;
                    console.log(`✅ Cached: ${path.basename(filePath)} (${generated}/${total})`);
                  } else {
                    throw new Error("QR buffer null");
                  }
                } else {
                  generated++;
                }

              } catch (err) {
                skipped.push({ symbol, totalUSD });
                console.warn(`⚠️ Skipped ${symbol} for $${totalUSD}: ${err.message}`);
              }
            }
          }
        }
      }
    }

    // 🔁 Retry skipped
    if (skipped.length > 0) {
      console.log(`🔁 Retrying ${skipped.length} skipped fallbacks...`);
      for (const { symbol, totalUSD } of skipped) {
        try {
          await rateLimiter(symbol);
          const rate = await fetchCryptoPrice(symbol);
          if (!rate || rate <= 0) continue;
          const amount = +(totalUSD / rate).toFixed(6);
          const filePath = getFallbackPath(symbol, amount);
          if (!existsSync(filePath)) {
            const buffer = await generateQR(symbol, amount);
            if (buffer) {
              await fs.writeFile(filePath, buffer);
              console.log(`✅ Retried: ${path.basename(filePath)}`);
            }
          }
        } catch (err) {
          console.warn(`❌ Retry failed [${symbol} | $${totalUSD}]: ${err.message}`);
        }
      }
    }

    console.log(`🎯 [generateFullQrCache] Fallbacks done: ${generated}/${total}`);

  } catch (err) {
    console.error("❌ [generateFullQrCache] Error:", err.message);
  }
}

/**
 * ♻️ Manual fallback QR rebuild
 */
export async function refreshQrCache() {
  console.log("♻️ [refreshQrCache] Refresh started...");
  await generateFullQrCache();
}
