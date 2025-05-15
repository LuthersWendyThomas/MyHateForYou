// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v9999999999•RETRY•SYNCLOCK
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
  const symbols = Object.keys(NETWORKS);
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
            const key = `${normalized}_${sanitizeAmount(totalUSD)}`;
            if (seenKeys.has(key)) continue;

            seenKeys.add(key);
            queue.push({ rawSymbol, totalUSD, normalized });
          }
        }
      }
    }
  }

  console.log(`🚀 [QR Cache] Preparing to generate ${queue.length} unique fallback QR codes...`);

  const failed = new Set();
  const successful = new Set();

  async function processTask({ rawSymbol, totalUSD, normalized }) {
    let success = false;
    while (!success) {
      try {
        const rate = await fetchCryptoPrice(rawSymbol);
        if (!rate || rate <= 0) throw new Error("Invalid rate");

        const amount = sanitizeAmount(totalUSD / rate);
        const buffer = await generateQR(normalized, amount);
        if (buffer && Buffer.isBuffer(buffer) && buffer.length > 1000) {
          const fileName = `qr-cache/${normalized}_${amount}.png`;
          await fs.writeFile(fileName, buffer);
          console.log(`✅ [QR] ${normalized} $${totalUSD} → ${amount.toFixed(6)}`);
          successful.add(`${normalized}_${amount}`);
          success = true;
        } else {
          throw new Error("QR buffer invalid");
        }
      } catch (err) {
        console.warn(`⏳ [Retry in ${RETRY_DELAY_MS / 1000}s] ${normalized} $${totalUSD} → ${err.message}`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  const runInBatches = async (tasks, concurrency) => {
    let i = 0;
    const runNext = async () => {
      if (i >= tasks.length) return;
      const task = tasks[i++];
      await processTask(task);
      return runNext();
    };
    const runners = Array.from({ length: concurrency }, runNext);
    await Promise.all(runners);
  };

  await runInBatches(queue, MAX_CONCURRENCY);

  console.log(`🎯 [DONE] Fallback QR cache generated: ${successful.size}/${queue.length}`);
}
