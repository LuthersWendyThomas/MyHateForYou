// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v3.0•DIAMONDLOCK•AMOUNTSAFE•BULLETPROOF
// 100% AMOUNT-BASED PNG CACHING • FALLBACK AUTO-GENERATION • FULLY SYNCED WITH generateQR.js

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateQR } from "./generateQR.js";
import { fetchCryptoPrice, NETWORKS } from "./fetchCryptoPrice.js";
import { products } from "../config/products.js";
import { deliveryMethods } from "../config/features.js";

const CACHE_DIR = path.join(process.cwd(), "qr-cache");

// ✅ Ensure cache dir exists
export async function initQrCacheDir() {
  try {
    if (!existsSync(CACHE_DIR)) {
      await fs.mkdir(CACHE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("❌ [initQrCacheDir]", err.message);
  }
}

// ✅ Build fallback filename (e.g. ETH_0.123456.png)
function getAmountFilename(symbol, amount) {
  return `${symbol}_${Number(amount).toFixed(6)}.png`;
}

// ✅ Return cached QR or generate + store if missing
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

    // ❌ Miss → generate live and cache it
    console.warn(`❌ [getCachedQR] Missed: ${fileName} → generating live...`);
    const buffer = await generateQR(symbol, amount);
    if (!buffer || buffer.length < 1000) {
      throw new Error("Live QR generation failed or invalid.");
    }

    await fs.writeFile(filePath, buffer);
    console.log(`💾 [getCachedQR] Live fallback saved: ${fileName}`);
    return buffer;

  } catch (err) {
    console.error("❌ [getCachedQR] Error:", err.message);
    return null;
  }
}

// ✅ Delete all existing cached PNGs
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

// ✅ Generate full fallback cache for all products + delivery + networks
export async function generateFullQrCache() {
  try {
    await initQrCacheDir();
    await cleanQrCacheDir();

    const deliveryFees = Object.values(deliveryMethods)
      .map(method => Number(method.fee || 0))
      .filter(fee => fee > 0);

    for (const category in products) {
      for (const product of products[category]) {
        const { name, prices = {}, active } = product;
        if (!active) continue;

        for (const [qty, basePrice] of Object.entries(prices)) {
          const baseUSD = Number(basePrice);
          if (!Number.isFinite(baseUSD)) continue;

          for (const deliveryFee of deliveryFees) {
            const totalUSD = baseUSD + deliveryFee;

            for (const symbol of Object.keys(NETWORKS)) {
              try {
                const rate = await fetchCryptoPrice(symbol);
                if (!Number.isFinite(rate) || rate <= 0) continue;

                const amount = +(totalUSD / rate).toFixed(6);
                const fileName = getAmountFilename(symbol, amount);
                const filePath = path.join(CACHE_DIR, fileName);

                if (!existsSync(filePath)) {
                  const buffer = await generateQR(symbol, amount);
                  if (buffer) {
                    await fs.writeFile(filePath, buffer);
                    console.log(`✅ [generateFullQrCache] Cached: ${fileName}`);
                  }
                }

                // ✅ Delay to avoid rate limits
                await new Promise(r => setTimeout(r, 300));

              } catch (innerErr) {
                console.warn(`⚠️ [generateFullQrCache] Skipped ${symbol}:`, innerErr.message);
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

// ✅ External trigger (used by refresh job)
export async function refreshQrCache() {
  console.log("♻️ [refreshQrCache] Refresh started...");
  await generateFullQrCache();
}
