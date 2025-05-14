// 📦 jobs/refreshQrCache.js | IMMORTAL FINAL v4.0.0•DIAMONDLOCK•SYNCED•NO-MISMATCH
// 100% FALLBACK REBUILDER • MATCHES generateQR + getAmountFilename EXACTLY

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

import { generateQR, getFallbackPath, getAmountFilename } from "../utils/generateQR.js";
import { fetchCryptoPrice, NETWORKS } from "../utils/fetchCryptoPrice.js";
import { products } from "../config/products.js";
import { rateLimiter } from "../utils/rateLimiter.js";
import { sendAdminPing } from "../core/handlers/paymentHandler.js";

const CACHE_DIR = path.join(process.cwd(), "qr-cache");
const deliveryFees = [5, 10]; // From features.js

export function startQrCacheRefresher() {
  console.log("🕒 [refreshQrCache] QR refresher initialized — every 4 hours");
  tryRefresh(true);
  setInterval(() => tryRefresh(false), 4 * 60 * 60 * 1000);
}

async function tryRefresh(isStartup = false) {
  const now = new Date().toLocaleTimeString("en-GB");
  const label = isStartup
    ? "🔄 QR fallback cache generated on bot startup."
    : "♻️ QR fallback cache auto-refreshed (every 4h).";

  try {
    console.log(`♻️ [refreshQrCache] Started at ${now} (${isStartup ? "startup" : "interval"})`);
    await generateFullQrCache();
    console.log("✅ [refreshQrCache] Full PNG fallback cache rebuilt.");
    await sendAdminPing(label);
  } catch (err) {
    console.error("❌ [refreshQrCache] Refresh failed:", err.message);
    try {
      await sendAdminPing(`❌ QR refresh failed: *${err.message}*`);
    } catch (e) {
      console.warn("⚠️ [Admin ping error]:", e.message);
    }
  }
}

async function ensureCacheDir() {
  try {
    if (!existsSync(CACHE_DIR)) await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (err) {
    console.error("❌ [ensureCacheDir]", err.message);
  }
}

async function cleanOldPngs() {
  try {
    const files = await fs.readdir(CACHE_DIR);
    let deleted = 0;
    for (const file of files) {
      if (file.endsWith(".png")) {
        await fs.unlink(path.join(CACHE_DIR, file));
        deleted++;
      }
    }
    console.log(`🧹 [cleanOldPngs] Deleted ${deleted} old PNGs.`);
  } catch (err) {
    console.warn("⚠️ [cleanOldPngs] Failed:", err.message);
  }
}

export async function generateFullQrCache() {
  await ensureCacheDir();
  await cleanOldPngs();

  const skipped = [];
  let total = 0;
  let generated = 0;

  for (const category in products) {
    for (const product of products[category]) {
      const { prices = {} } = product;

      for (const [qty, priceUSD] of Object.entries(prices)) {
        const base = Number(priceUSD);
        if (!Number.isFinite(base)) continue;

        for (const fee of deliveryFees) {
          const totalUSD = base + fee;

          for (const symbol of Object.keys(NETWORKS)) {
            total++;
            try {
              await rateLimiter(symbol);
              const rate = await fetchCryptoPrice(symbol);
              if (!rate || rate <= 0) throw new Error("Invalid rate");

              const amount = +(totalUSD / rate).toFixed(6);
              const filename = getAmountFilename(symbol, amount);
              const filePath = path.join(CACHE_DIR, filename);

              if (!existsSync(filePath)) {
                const buffer = await generateQR(symbol, amount);
                if (!buffer) throw new Error("QR buffer null");
                await fs.writeFile(filePath, buffer);
                console.log(`✅ Cached: ${filename} (${++generated}/${total})`);
              } else {
                generated++;
              }
            } catch (err) {
              skipped.push({ symbol, usd: totalUSD });
              console.warn(`⚠️ Skipped ${symbol} $${totalUSD}: ${err.message}`);
            }
          }
        }
      }
    }
  }

  // Retry skipped
  if (skipped.length) {
    console.log(`🔁 Retrying ${skipped.length} skipped fallbacks...`);
    for (const { symbol, usd } of skipped) {
      try {
        await rateLimiter(symbol);
        const rate = await fetchCryptoPrice(symbol);
        if (!rate || rate <= 0) continue;
        const amount = +(usd / rate).toFixed(6);
        const filename = getAmountFilename(symbol, amount);
        const filePath = path.join(CACHE_DIR, filename);

        if (!existsSync(filePath)) {
          const buffer = await generateQR(symbol, amount);
          if (buffer) {
            await fs.writeFile(filePath, buffer);
            console.log(`✅ Retried: ${filename}`);
          }
        }
      } catch (err) {
        console.warn(`❌ Retry failed: ${symbol} $${usd}: ${err.message}`);
      }
    }
  }

  console.log(`🎯 [generateFullQrCache] Done: ${generated}/${total} PNGs`);
}
