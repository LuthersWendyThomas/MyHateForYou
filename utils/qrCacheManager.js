import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateQR } from "./generateQR.js";
import { fetchCryptoPrice, NETWORKS } from "./fetchCryptoPrice.js";
import { products } from "../config/products.js";
import { DISCOUNTS } from "../config/discounts.js";
import { DELIVERY_METHODS } from "../config/features.js";

const CACHE_DIR = path.join(process.cwd(), "qr-cache");

// ✅ Create folder if missing
export async function initQrCacheDir() {
  try {
    if (!existsSync(CACHE_DIR)) {
      await fs.mkdir(CACHE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("❌ [initQrCacheDir]", err.message);
  }
}

// ✅ File naming: SYMBOL_0.123456.png
function getAmountFilename(symbol, amount) {
  return `${symbol}_${Number(amount).toFixed(6)}.png`;
}

// ✅ Read from cache or generate live if missing
export async function getCachedQR(symbol, amount) {
  const fileName = getAmountFilename(symbol, amount);
  const filePath = path.join(CACHE_DIR, fileName);

  try {
    if (existsSync(filePath)) {
      const buffer = await fs.readFile(filePath);
      if (buffer?.length > 1000) {
        if (process.env.DEBUG_MESSAGES === "true") {
          console.log(`📦 [getCachedQR] Cache hit: ${fileName}`);
        }
        return buffer;
      }
    }

    // ❌ Miss → Generate live
    console.warn(`❌ [getCachedQR] Missed: ${fileName} → generating live...`);
    const buffer = await generateQR(symbol, amount);
    if (!buffer || buffer.length < 1000) {
      throw new Error("Live QR generation failed or invalid");
    }

    await fs.writeFile(filePath, buffer);
    console.log(`💾 [getCachedQR] Live fallback saved: ${fileName}`);
    return buffer;

  } catch (err) {
    console.error("❌ [getCachedQR] Error:", err.message);
    return null;
  }
}

// ✅ Clean up all PNGs
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

// ✅ Pre-generate all fallback QR codes (hourly)
export async function generateFullQrCache() {
  try {
    await initQrCacheDir();
    await cleanQrCacheDir();

    const discountPct = DISCOUNTS.global?.active ? DISCOUNTS.global.percentage || 0 : 0;
    const deliveryFees = Object.values(DELIVERY_METHODS)
      .map(m => Number(m.fee || 0))
      .filter(fee => fee > 0);

    for (const category in products) {
      for (const product of products[category]) {
        const { name, prices = {}, active } = product;
        if (!active) continue;

        for (const [qty, basePrice] of Object.entries(prices)) {
          for (const deliveryFee of deliveryFees) {
            const usd = (basePrice + deliveryFee) * (1 - discountPct / 100);

            for (const symbol of Object.keys(NETWORKS)) {
              const rate = await fetchCryptoPrice(symbol);
              if (!Number.isFinite(rate) || rate <= 0) continue;

              const amount = +(usd / rate).toFixed(6);
              const fileName = getAmountFilename(symbol, amount);
              const filePath = path.join(CACHE_DIR, fileName);

              if (!existsSync(filePath)) {
                const buffer = await generateQR(symbol, amount);
                if (buffer) {
                  await fs.writeFile(filePath, buffer);
                  console.log(`✅ [generateFullQrCache] Cached: ${fileName}`);
                }
              }
            }
          }
        }
      }
    }

    console.log("✅ [generateFullQrCache] All fallback QR files generated.");
  } catch (err) {
    console.error("❌ [generateFullQrCache] Failed:", err.message);
  }
}

// ✅ Trigger manually or from refresher job
export async function refreshQrCache() {
  console.log("♻️ [refreshQrCache] Refresh started...");
  await generateFullQrCache();
}
