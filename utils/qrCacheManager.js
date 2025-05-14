// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v4.1.0•DIAMONDLOCK•MAXSYNC•FILENAME-SANITIZED

import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { generateQR } from "./generateQR.js";
import { fetchCryptoPrice, NETWORKS } from "./fetchCryptoPrice.js";
import { products } from "../config/products.js";
import { rateLimiter } from "./rateLimiter.js";
import {
  getAmountFilename,
  getFallbackPath,
  FALLBACK_DIR,
  sanitizeAmount
} from "./fallbackPathUtils.js";

export async function initQrCacheDir() {
  try {
    if (!existsSync(FALLBACK_DIR)) await fs.mkdir(FALLBACK_DIR, { recursive: true });
  } catch (err) {
    console.error("❌ [initQrCacheDir]", err.message);
  }
}

export async function cleanQrCacheDir() {
  try {
    if (!existsSync(FALLBACK_DIR)) return;
    const files = await fs.readdir(FALLBACK_DIR);
    let deleted = 0;
    for (const file of files) {
      if (file.endsWith(".png")) {
        await fs.unlink(path.join(FALLBACK_DIR, file));
        deleted++;
      }
    }
    console.log(`🧹 [cleanQrCacheDir] Deleted ${deleted} PNGs.`);
  } catch (err) {
    console.warn("⚠️ [cleanQrCacheDir] Failed:", err.message);
  }
}

export async function getCachedQR(symbol, amount) {
  const sanitized = sanitizeAmount(amount);
  const filePath = getFallbackPath(symbol, sanitized);
  try {
    if (existsSync(filePath)) {
      const buffer = await fs.readFile(filePath);
      if (buffer?.length > 1000) return buffer;
    }

    const buffer = await generateQR(symbol, sanitized);
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

export async function generateFullQrCache() {
  try {
    await initQrCacheDir();
    await cleanQrCacheDir();

    const deliveryFees = [5, 10];
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

                const amount = sanitizeAmount(totalUSD / rate);
                const filePath = getFallbackPath(symbol, amount);

                if (!existsSync(filePath)) {
                  const buffer = await generateQR(symbol, amount);
                  if (buffer && buffer.length > 1000) {
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

    if (skipped.length > 0) {
      console.log(`🔁 Retrying ${skipped.length} skipped fallbacks...`);
      for (const { symbol, totalUSD } of skipped) {
        try {
          await rateLimiter(symbol);
          const rate = await fetchCryptoPrice(symbol);
          if (!rate || rate <= 0) continue;
          const amount = sanitizeAmount(totalUSD / rate);
          const filePath = getFallbackPath(symbol, amount);
          if (!existsSync(filePath)) {
            const buffer = await generateQR(symbol, amount);
            if (buffer && buffer.length > 1000) {
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

export async function refreshQrCache() {
  console.log("♻️ [refreshQrCache] Refresh started...");
  await generateFullQrCache();
}
