// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v1.0.9•GODMODE•CACHELOCK•SYNC
// BULLETPROOF QR FALLBACK SYSTEM • PER PRODUCT + QTY + SYMBOL • AUTO CLEANUP + PNG CACHE

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateQRBuffer } from "./generateQR.js"; // ✅ uses buffer-only export
import { fetchCryptoPrice, NETWORKS } from "./fetchCryptoPrice.js";
import { products } from "../config/products.js";

const CACHE_DIR = path.join(process.cwd(), "qr-cache");

// ✅ Initial setup: create cache dir if needed
export async function initQrCacheDir() {
  try {
    if (!existsSync(CACHE_DIR)) {
      await fs.mkdir(CACHE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("❌ [initQrCacheDir]", err.message);
  }
}

// ✅ Get QR file path based on product, quantity and symbol
function getQrPath(productName, qty, symbol) {
  const fileName = `${sanitize(productName)}_${qty}_${symbol}.png`;
  return path.join(CACHE_DIR, fileName);
}

// ✅ Return PNG buffer if exists, or null
export async function getCachedQR(productName, qty, symbol) {
  try {
    const filePath = getQrPath(productName, qty, symbol);
    await fs.access(filePath);
    const buffer = await fs.readFile(filePath);
    if (buffer?.length > 0) return buffer;
    return null;
  } catch {
    return null;
  }
}

// ✅ Generate and save QR PNG for given inputs
export async function generateAndSaveQr(productName, qty, symbol, usdPrice, walletAddress) {
  try {
    const rate = await fetchCryptoPrice(symbol);
    const amount = +(usdPrice / rate).toFixed(6);
    const buffer = await generateQRBuffer(symbol, amount, walletAddress);
    if (!buffer) throw new Error("Empty buffer from generateQRBuffer");
    const filePath = getQrPath(productName, qty, symbol);
    await fs.writeFile(filePath, buffer);
    console.log(`✅ [generateAndSaveQr] Cached: ${filePath}`);
  } catch (err) {
    console.error("❌ [generateAndSaveQr]", err.message);
  }
}

// ✅ Generate all QR codes for current config (1h fallback)
export async function generateFullQrCache() {
  try {
    await initQrCacheDir();
    await cleanQrCacheDir(); // ✅ DELETE OLD PNGS BEFORE REFRESH

    for (const category in products) {
      for (const product of products[category]) {
        const { name, prices = {}, active } = product;
        if (!active) continue;

        for (const [qty, price] of Object.entries(prices)) {
          for (const symbol of Object.keys(NETWORKS)) {
            const wallet = NETWORKS[symbol]?.address;
            if (!wallet || !Number(price)) continue;
            await generateAndSaveQr(name, qty, symbol, price, wallet);
          }
        }
      }
    }

    console.log("✅ [generateFullQrCache] All QR combinations cached.");
  } catch (err) {
    console.error("❌ [generateFullQrCache]", err.message);
  }
}

// ✅ Delete old cached PNGs
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

    console.log(`🧹 [cleanQrCacheDir] Cleared ${deleted} old PNGs.`);
  } catch (err) {
    console.warn("⚠️ [cleanQrCacheDir] Failed:", err.message);
  }
}

// ✅ Main hourly cache refresher
export async function refreshQrCache() {
  console.log("♻️ [refreshQrCache] Starting QR cache refresh...");
  await generateFullQrCache();
}

// ——— Helpers ———

function sanitize(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_");
}

// ✅ Final export for all modules needing fallback
export {
  generateFullQrCache,
  refreshQrCache,
  getCachedQR,
  generateAndSaveQr,
  initQrCacheDir
};
