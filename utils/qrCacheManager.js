// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v1.4.0•DIAMONDLOCK•FULLSYNC•SANITIZED
// 24/7 QR ENGINE • PNG FALLBACK SYSTEM • SANITIZED FILENAMES • 100% HIT RATE

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateQRBuffer } from "./generateQR.js";
import { fetchCryptoPrice, NETWORKS } from "./fetchCryptoPrice.js";
import { products } from "../config/products.js";

const CACHE_DIR = path.join(process.cwd(), "qr-cache");

// ✅ Ensure fallback folder exists
export async function initQrCacheDir() {
  try {
    if (!existsSync(CACHE_DIR)) {
      await fs.mkdir(CACHE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("❌ [initQrCacheDir]", err.message);
  }
}

// ✅ Unified PNG path resolver (sanitized)
function getQrPath(productName, qty, symbol) {
  const fileName = `${sanitize(productName)}_${qty}_${symbol}.png`;
  return path.join(CACHE_DIR, fileName);
}

// ✅ Generate + save fallback PNG
export async function generateAndSaveQr(productNameRaw, qty, symbol, usdPrice, walletAddress) {
  try {
    const productName = sanitize(productNameRaw); // 🔐 ensure safe filename
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

// ✅ Full fallback QR cache generator (run hourly)
export async function generateFullQrCache() {
  try {
    await initQrCacheDir();
    await cleanQrCacheDir();

    for (const category in products) {
      for (const product of products[category]) {
        const { name, prices = {}, active } = product;
        if (!active) continue;

        for (const [qty, price] of Object.entries(prices)) {
          for (const symbol of Object.keys(NETWORKS)) {
            const wallet = NETWORKS[symbol]?.address;
            if (!wallet || !Number(price)) continue;

            const sanitizedName = sanitize(name);
            await generateAndSaveQr(sanitizedName, qty, symbol, price, wallet);
          }
        }
      }
    }

    console.log("✅ [generateFullQrCache] All QR fallbacks cached.");
  } catch (err) {
    console.error("❌ [generateFullQrCache]", err.message);
  }
}

// ✅ Cleanup all old PNGs
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

// ✅ Run cache refresh (boot or hourly)
export async function refreshQrCache() {
  console.log("♻️ [refreshQrCache] Refresh started...");
  await generateFullQrCache();
}

// ✅ Main fallback fetcher (auto live fallback if missing)
export async function getCachedQR(symbol, amount, wallet, productNameRaw, qty) {
  const productName = sanitize(productNameRaw); // ⬅ critical fix
  const filePath = getQrPath(productName, qty, symbol);

  try {
    if (existsSync(filePath)) {
      const buffer = await fs.readFile(filePath);
      if (buffer?.length > 1000) {
        if (process.env.DEBUG_MESSAGES === "true") {
          console.log(`📦 [getCachedQR] Cache hit: ${filePath}`);
        }
        return buffer;
      } else {
        console.warn(`⚠️ [getCachedQR] PNG too small: ${filePath}`);
      }
    }

    // ❌ Miss → generate and save
    console.warn(`❌ [getCachedQR] Cache miss: ${filePath} → generating live fallback...`);
    const buffer = await generateQRBuffer(symbol, amount, wallet);
    if (!buffer || buffer.length < 1000) {
      throw new Error("Live QR generation failed or buffer invalid");
    }

    await fs.writeFile(filePath, buffer);
    console.log(`💾 [getCachedQR] Live fallback saved: ${filePath}`);
    return buffer;

  } catch (err) {
    console.error("❌ [getCachedQR fallback error]", err.message);
    return null;
  }
}

// ✅ Filename sanitizer (same logic used everywhere)
export function sanitize(str) {
  return String(str || "")
    .trim()
    .replace(/\s+/g, "_")              // spaces to _
    .replace(/[^\w]/g, "")             // remove special chars
    .replace(/_+/g, "_")               // collapse ___
    .toLowerCase();
}
