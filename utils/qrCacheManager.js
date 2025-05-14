// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v1.1.0•GODMODE•CACHELOCK•BULLETPROOF
// QR PNG FALLBACK SYSTEM • PRODUCT + QTY + SYMBOL • AUTO REFRESH + CLEAN

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateQR, generateQRBuffer } from "./generateQR.js"; // ✅ Fix: full imports
import { fetchCryptoPrice, NETWORKS } from "./fetchCryptoPrice.js";
import { products } from "../config/products.js";

const CACHE_DIR = path.join(process.cwd(), "qr-cache");

// ✅ Create cache dir if not exist
export async function initQrCacheDir() {
  try {
    if (!existsSync(CACHE_DIR)) {
      await fs.mkdir(CACHE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("❌ [initQrCacheDir]", err.message);
  }
}

// ✅ Get file path
function getQrPath(productName, qty, symbol) {
  const fileName = `${sanitize(productName)}_${qty}_${symbol}.png`;
  return path.join(CACHE_DIR, fileName);
}

// ✅ Return buffer if cached QR PNG exists
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

// ✅ Generate QR + save as PNG
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

// ✅ Generate full fallback PNG set
export async function generateFullQrCache() {
  try {
    await initQrCacheDir();
    await cleanQrCacheDir(); // 🧼 clean before regenerating

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

    console.log("✅ [generateFullQrCache] QR cache fully rebuilt.");
  } catch (err) {
    console.error("❌ [generateFullQrCache]", err.message);
  }
}

// ✅ Delete all existing PNGs before refresh
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

    console.log(`🧹 [cleanQrCacheDir] Deleted ${deleted} old PNGs.`);
  } catch (err) {
    console.warn("⚠️ [cleanQrCacheDir] Failed:", err.message);
  }
}

// ✅ Hourly refresh starter
export async function refreshQrCache() {
  console.log("♻️ [refreshQrCache] Refresh started...");
  await generateFullQrCache();
}

// ——— Helpers ———

function sanitize(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_");
}

// ✅ Final export

export {
  generateFullQrCache,
  refreshQrCache,
  getCachedQR,
  generateAndSaveQr,
  initQrCacheDir
};
