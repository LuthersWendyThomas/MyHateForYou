// 📦 utils/qrCacheManager.js | FINAL IMMORTAL v999999999.∞.ULTRA•GODMODE•DIAMONDLOCK
// FULL 520x SUPPORT • BTC+ETH+MATIC+SOL • 2 DELIVERY FEES • 65 PRODUCTS • BULLETPROOF 24/7

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateQR, normalizeSymbol } from "./generateQR.js";
import { products } from "../config/products.js";
import { deliveryMethods } from "../config/features.js";
import { sanitizeAmount } from "./fallbackPathUtils.js";
import { NETWORKS } from "./fetchCryptoPrice.js";
import { fetchCryptoPrice } from "./fetchCryptoPrice.js";

const MAX_CONCURRENCY = 10;
const RETRY_DELAY_MS = 3000;

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
  const symbols = Object.keys(NETWORKS); // [BTC, ETH, MATIC, SOL]
  const seenKeys = new Set();
  const queue = [];

  for (const category in products) {
    for (const product of products[category]) {
      const prices = product.prices || {};
      for (const [qty, price] of Object.entries(prices)) {
        const usd = Number(price);
        if (!usd || usd <= 0) continue;

        for (const fee of deliveryFees) {
          const totalUSD = usd + fee;

          for (const rawSymbol of symbols) {
            const normalized = normalizeSymbol(rawSymbol);
            const rateKey = sanitizeAmount(totalUSD); // For dedupe
            const key = `${normalized}_${rateKey}`;
            if (seenKeys.has(key)) continue;

            seenKeys.add(key);
            queue.push({ rawSymbol, totalUSD, normalized });
          }
        }
      }
    }
  }

  console.log(`🚀 [QR Cache] Preparing ${queue.length} unique fallback QR scenarios...`);

  let done = 0;
  const successful = new Set();

  async function processTask(index, total, { rawSymbol, totalUSD, normalized }) {
    let retryCount = 0;
    while (retryCount < 5) {
      try {
        let rate;
        try {
          rate = await fetchCryptoPrice(rawSymbol);
        } catch (err) {
          console.warn(`❌ [Rate Fetch Error] ${rawSymbol}:`, err.message || err);
          await sleep(RETRY_DELAY_MS);
          retryCount++;
          continue;
        }

        if (!rate || rate <= 0) {
          console.warn(`❌ [Invalid Rate] ${rawSymbol} returned: ${rate}`);
          await sleep(RETRY_DELAY_MS);
          retryCount++;
          continue;
        }

        const amount = sanitizeAmount(totalUSD / rate);
        const fileName = `qr-cache/${normalized}_${amount.toFixed(6)}.png`;

        if (existsSync(fileName)) {
          done++;
          successful.add(`${normalized}_${amount}`);
          console.log(`🟦 [${index}/${total}] Already exists: ${normalized} $${totalUSD} → ${amount}`);
          return;
        }

        const buffer = await generateQR(normalized, amount);
        if (buffer && Buffer.isBuffer(buffer) && buffer.length > 1000) {
          await fs.writeFile(fileName, buffer);
          successful.add(`${normalized}_${amount}`);
          done++;
          console.log(`✅ [${index}/${total}] ${normalized} $${totalUSD} → ${amount}`);
          return;
        } else {
          throw new Error("QR buffer invalid");
        }
      } catch (err) {
        retryCount++;
        console.warn(`⏳ [Retry #${retryCount} | ${index}/${total}] ${normalized} $${totalUSD} → ${err.message}`);
        await sleep(RETRY_DELAY_MS);
      }
    }
    console.warn(`❌ [FAILED] ${normalized} $${totalUSD} after ${retryCount} retries.`);
  }

  const runInBatches = async (tasks, concurrency) => {
    let index = 0;
    const total = tasks.length;
    const runNext = async () => {
      if (index >= total) return;
      const task = tasks[index];
      const i = index + 1;
      index++;
      await processTask(i, total, task);
      return runNext();
    };
    const runners = Array.from({ length: concurrency }, runNext);
    await Promise.all(runners);
  };

  await runInBatches(queue, MAX_CONCURRENCY);

  console.log(`🎯 [DONE] QR fallback generation complete: ${successful.size}/${queue.length}`);
  if (successful.size < queue.length) {
    console.warn(`⚠️ Some QR PNGs failed to generate: ${queue.length - successful.size} missing.`);
  }
}
