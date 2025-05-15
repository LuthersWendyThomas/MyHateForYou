// 📦 utils/qrCacheManager.js | FINAL IMMORTAL v999999999.∞.ULTRA•GODMODE•DIAMONDLOCK
// FIXED: 520x Fallback Scenarios Covered Correctly (65x products/prices × 2 deliveryFees × 4 networks)

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import PQueue from "p-queue";
import { generateQR, normalizeSymbol } from "./generateQR.js";
import { products } from "../config/products.js";
import { deliveryMethods } from "../config/features.js";
import { sanitizeAmount } from "./fallbackPathUtils.js";
import { NETWORKS } from "./fetchCryptoPrice.js";
import { fetchCryptoPrice } from "./fetchCryptoPrice.js";

const MAX_CONCURRENCY = 10;
const MAX_RETRIES = 7;
const BASE_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function initQrCacheDir() {
  const dir = "qr-cache";
  if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true });
}

export async function cleanQrCacheDir() {
  try {
    const files = await fs.readdir("qr-cache");
    const targets = files.filter(f => f.endsWith(".png"));
    for (const f of targets) await fs.unlink(path.join("qr-cache", f));
    console.log(`🧹 [cleanQrCacheDir] Deleted ${targets.length} old PNGs.`);
  } catch (err) {
    console.warn("⚠️ [cleanQrCacheDir]", err.message);
  }
}

export async function generateFullQrCache() {
  await initQrCacheDir();

  const deliveryFees = deliveryMethods.map(m => Number(m.fee));
  const networks = Object.keys(NETWORKS);
  const allTasks = [];

  for (const category in products) {
    for (const product of products[category]) {
      if (!product.prices) continue;

      for (const [qty, price] of Object.entries(product.prices)) {
        const usd = Number(price);
        if (!usd || usd <= 0) continue;

        for (const fee of deliveryFees) {
          const totalUSD = usd + fee;

          for (const rawSymbol of networks) {
            const normalized = normalizeSymbol(rawSymbol);
            allTasks.push({ rawSymbol, totalUSD, normalized });
          }
        }
      }
    }
  }

  console.log(`🚀 [QR Cache] Starting regeneration of ${allTasks.length} fallback QR scenarios...`);

  const queue = new PQueue({ concurrency: MAX_CONCURRENCY });
  const successful = new Set();
  const failed = [];
  let done = 0;

  for (const task of allTasks) {
    queue.add(() =>
      attemptGenerate(task, done + 1, allTasks.length, successful, failed).then(() => done++)
    );
  }

  await queue.onIdle();

  console.log(`🎯 [DONE] QR fallback generation complete: ${successful.size}/${allTasks.length}`);
  if (failed.length > 0) {
    console.warn(`⚠️ Missing QR PNGs: ${failed.length} from ${allTasks.length}`);
    for (const fail of failed) {
      console.warn(`❌ FAILED: ${fail.normalized} → $${fail.totalUSD}`);
    }
  }
}

async function attemptGenerate({ rawSymbol, totalUSD, normalized }, index, total, successful, failed) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const rate = await fetchCryptoPrice(rawSymbol);
      if (!rate || rate <= 0) throw new Error(`Invalid rate: ${rate}`);

      const amount = sanitizeAmount(totalUSD / rate);
      const fileName = `qr-cache/${normalized}_${amount.toFixed(6)}.png`;

      if (existsSync(fileName)) {
        console.log(`🟦 [${index}/${total}] Exists: ${normalized} $${totalUSD} → ${amount}`);
        successful.add(fileName);
        return;
      }

      const buffer = await generateQR(normalized, amount);
      if (!buffer || buffer.length < 1000) throw new Error("Invalid QR buffer");

      await fs.writeFile(fileName, buffer);
      successful.add(fileName);
      console.log(`✅ [${index}/${total}] ${normalized} $${totalUSD} → ${amount}`);
      return;
    } catch (err) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`⏳ [${index}/${total}] Retry #${attempt + 1} after ${delay}ms → ${normalized} $${totalUSD} → ${err.message}`);
      await sleep(delay);
    }
  }

  failed.push({ rawSymbol, totalUSD, normalized });
}

