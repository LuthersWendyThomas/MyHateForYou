// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v3.1.0•DIAMONDLOCK•RETRYFIXED

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateQR } from "./generateQR.js";
import { fetchCryptoPrice, NETWORKS } from "./fetchCryptoPrice.js";
import { products } from "../config/products.js";
import { deliveryMethods } from "../config/features.js";
import { rateLimiter } from "./rateLimiter.js";

const CACHE_DIR = path.join(process.cwd(), "qr-cache");

export async function initQrCacheDir() {
  try {
    if (!existsSync(CACHE_DIR)) await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (err) {
    console.error("❌ [initQrCacheDir]", err.message);
  }
}

function getAmountFilename(symbol, amount) {
  return `${symbol}_${Number(amount).toFixed(6)}.png`;
}

export async function getCachedQR(symbol, amount) {
  const fileName = getAmountFilename(symbol, amount);
  const filePath = path.join(CACHE_DIR, fileName);

  try {
    if (existsSync(filePath)) {
      const buffer = await fs.readFile(filePath);
      if (buffer?.length > 1000) return buffer;
    }

    const buffer = await generateQR(symbol, amount);
    if (buffer && buffer.length > 1000) {
      await fs.writeFile(filePath, buffer);
      console.log(`💾 [getCachedQR] Fallback created: ${fileName}`);
      return buffer;
    }

    throw new Error("QR generation failed.");
  } catch (err) {
    console.error("❌ [getCachedQR] Error:", err.message);
    return null;
  }
}

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
    console.log(`🧹 [cleanQrCacheDir] Removed ${deleted} old PNGs.`);
  } catch (err) {
    console.warn("⚠️ [cleanQrCacheDir] Failed:", err.message);
  }
}

export async function generateFullQrCache() {
  try {
    await initQrCacheDir();
    await cleanQrCacheDir();

    const deliveryFees = Object.values(deliveryMethods)
      .map(m => Number(m.fee || 0))
      .filter(fee => fee > 0);

    const skipped = [];

    for (const category in products) {
      for (const product of products[category]) {
        const { name, prices = {} } = product;
        for (const [qty, priceUSD] of Object.entries(prices)) {
          const baseUSD = Number(priceUSD);
          if (!Number.isFinite(baseUSD)) continue;

          for (const deliveryFee of deliveryFees) {
            const totalUSD = baseUSD + deliveryFee;

            for (const symbol of Object.keys(NETWORKS)) {
              try {
                await rateLimiter(symbol);
                const rate = await fetchCryptoPrice(symbol);
                if (!Number.isFinite(rate) || rate <= 0) throw new Error("Rate invalid");

                const amount = +(totalUSD / rate).toFixed(6);
                const fileName = getAmountFilename(symbol, amount);
                const filePath = path.join(CACHE_DIR, fileName);

                if (!existsSync(filePath)) {
                  const buffer = await generateQR(symbol, amount);
                  if (buffer) {
                    await fs.writeFile(filePath, buffer);
                    console.log(`✅ Cached: ${fileName}`);
                  } else {
                    throw new Error("QR buffer null");
                  }
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
          const amount = +(totalUSD / rate).toFixed(6);
          const fileName = getAmountFilename(symbol, amount);
          const filePath = path.join(CACHE_DIR, fileName);
          if (!existsSync(filePath)) {
            const buffer = await generateQR(symbol, amount);
            if (buffer) {
              await fs.writeFile(filePath, buffer);
              console.log(`✅ Retried + Cached: ${fileName}`);
            }
          }
        } catch (e) {
          console.warn(`❌ Retry failed [${symbol} | ${totalUSD}]: ${e.message}`);
        }
      }
    }

    console.log("✅ [generateFullQrCache] All QR fallbacks generated.");
  } catch (err) {
    console.error("❌ [generateFullQrCache] Failed:", err.message);
  }
}

export async function refreshQrCache() {
  console.log("♻️ [refreshQrCache] Refresh started...");
  await generateFullQrCache();
}
