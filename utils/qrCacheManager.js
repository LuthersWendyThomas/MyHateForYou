// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v1.0.0•GODMODE•CACHELOCK
// FULL QR FALLBACK SYSTEM • PER PRODUCT + QUANTITY + SYMBOL • PNG PERSISTENCE

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateQRBuffer } from "./generateQR.js";
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

// ✅ Return PNG path if exists, or null
export async function getCachedQrPath(productName, qty, symbol) {
  const filePath = getQrPath(productName, qty, symbol);
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

// ✅ Generate and save QR PNG for given inputs
export async function generateAndSaveQr(productName, qty, symbol, usdPrice, walletAddress) {
  try {
    const amount = +(usdPrice / (await fetchCryptoPrice(symbol))).toFixed(6);
    const buffer = await generateQRBuffer(symbol, amount, walletAddress);
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
  } catch (err) {
    console.error("❌ [generateFullQrCache]", err.message);
  }
}

// ——— Helpers ———

function sanitize(str) {
  return String(str || "").toLowerCase().replace(/[^a-z0-9]/gi, "_");
}
