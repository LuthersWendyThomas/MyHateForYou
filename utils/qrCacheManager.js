// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v1.3.0•DIAMONDLOCK•BULLETPROOF+FALLBACKSAFE
// 24/7 CACHED+LIVE QR ENGINE • PNG FALLBACK SYSTEM • SELF-HEAL • AUTO-SAVE

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateQRBuffer } from "./generateQR.js";
import { fetchCryptoPrice, NETWORKS } from "./fetchCryptoPrice.js";
import { products } from "../config/products.js";

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

// ✅ Resolve PNG path
function getQrPath(productName, qty, symbol) {
  const fileName = `${sanitize(productName)}_${qty}_${symbol}.png`;
  return path.join(CACHE_DIR, fileName);
}

// ✅ Generate and save QR PNG
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

// ✅ Generate all fallback PNGs (hourly)
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
            await generateAndSaveQr(name, qty, symbol, price, wallet);
          }
        }
      }
    }

    console.log("✅ [generateFullQrCache] All QR fallbacks cached.");
  } catch (err) {
    console.error("❌ [generateFullQrCache]", err.message);
  }
}

// ✅ Delete all PNGs before regeneration
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
    console.warn("⚠️ [cleanQrCacheDir]", err.message);
  }
}

// ✅ Hourly QR fallback rebuild
export async function refreshQrCache() {
  console.log("♻️ [refreshQrCache] Refresh started...");
  await generateFullQrCache();
}

// ✅ Main fallback retriever for paymentHandler (auto live fallback)
export async function getCachedQR(symbol, amount, wallet, productName, qty) {
  const fileName = `${sanitize(productName)}_${qty}_${symbol}.png`;
  const filePath = path.join(CACHE_DIR, fileName);

  try {
    // ✅ Try reading from cache
    if (existsSync(filePath)) {
      const buffer = await fs.readFile(filePath);
      if (buffer?.length > 1000) {
        if (process.env.DEBUG_MESSAGES === "true") {
          console.log(`📦 [getCachedQR] Cache hit: ${fileName}`);
        }
        return buffer;
      } else {
        console.warn(`⚠️ [getCachedQR] PNG too small: ${fileName}`);
      }
    }

    // ❌ If not found or invalid → generate live and store
    console.warn(`❌ [getCachedQR] Cache miss: ${fileName} → generating live fallback...`);
    const buffer = await generateQRBuffer(symbol, amount, wallet);
    if (!buffer || buffer.length < 1000) {
      throw new Error("Live QR generation failed or buffer invalid");
    }

    // 🧠 Save as fallback for next time
    await fs.writeFile(filePath, buffer);
    console.log(`💾 [getCachedQR] Live fallback saved: ${fileName}`);
    return buffer;

  } catch (err) {
    console.error("❌ [getCachedQR fallback error]", err.message);
    return null;
  }
}

// ——— Helpers ———

function sanitize(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_");
}
