// 📦 utils/qrCacheManager.js | FINAL IMMORTAL v999999999.∞•GODMODE•REQUEUE•FULLSYNC•VALIDATIONLOCK

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

  console.log(`🚀 [QR Cache] Starting generation of ${allTasks.length} fallback QR scenarios...`);

  const successful = new Set();
  let pending = [...allTasks];
  let attempts = 0;

  while (pending.length > 0 && attempts < 5) {
    attempts++;
    console.log(`🔁 [Retry Cycle ${attempts}] Remaining: ${pending.length}...`);

    const queue = new PQueue({ concurrency: MAX_CONCURRENCY });
    const failed = [];

    for (let i = 0; i < pending.length; i++) {
      const task = pending[i];
      queue.add(() =>
        attemptGenerate(task, i + 1, pending.length, successful, failed).catch(err => {
          console.warn(`❌ [queueTaskFailed] ${task.normalized} $${task.totalUSD}: ${err.message}`);
          failed.push(task);
        })
      );
    }

    await queue.onIdle();
    pending = failed;
  }

  console.log(`🎯 [DONE] QR fallback generation complete: ${successful.size}/${allTasks.length}`);
  if (successful.size < allTasks.length) {
    console.warn(`⚠️ Missing QR PNGs: ${allTasks.length - successful.size} from ${allTasks.length}`);
  } else {
    console.log(`💎 All fallback QR codes successfully generated!`);
  }
}

async function attemptGenerate({ rawSymbol, totalUSD, normalized }, index, total, successful, failed) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const rate = await fetchCryptoPrice(rawSymbol);
      if (!rate || rate <= 0) throw new Error(`Invalid rate: ${rate}`);

      const amount = sanitizeAmount(totalUSD / rate);
      if (!amount || amount <= 0) throw new Error(`Invalid sanitized amount: ${amount}`);

      const fileName = `qr-cache/${normalized}_${amount.toFixed(6)}.png`;
      const absPath = path.resolve(fileName);

      if (existsSync(absPath)) {
        successful.add(fileName);
        console.log(`🟦 [${index}/${total}] Exists: ${normalized} $${totalUSD} → ${amount}`);
        return;
      }

      const buffer = await generateQR(normalized, amount);
      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 1000) {
        throw new Error("Invalid QR buffer");
      }

      await fs.writeFile(absPath, buffer);
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

// ✅ DRY-RUN VALIDATOR: Check all PNGs for actual buffer integrity
export async function validateQrFallbacks() {
  try {
    const dir = "qr-cache";
    const files = await fs.readdir(dir);
    const pngs = files.filter(f => f.endsWith(".png"));
    let validCount = 0;
    let corruptCount = 0;

    for (const file of pngs) {
      const fullPath = path.join(dir, file);
      try {
        const buffer = await fs.readFile(fullPath);
        if (Buffer.isBuffer(buffer) && buffer.length > 1000) {
          validCount++;
        } else {
          corruptCount++;
          console.warn(`⚠️ Corrupt QR fallback: ${file}`);
        }
      } catch (err) {
        corruptCount++;
        console.warn(`⚠️ Failed to read QR fallback: ${file} — ${err.message}`);
      }
    }

    console.log(`📊 Fallback QR validation: ${validCount} valid / ${pngs.length} total`);
    if (corruptCount > 0) {
      console.warn(`❌ Detected ${corruptCount} corrupt or unreadable PNGs in fallback cache.`);
    } else {
      console.log(`✅ All fallback QR files are valid.`);
    }

  } catch (err) {
    console.error(`❌ Failed to validate fallback QR cache: ${err.message}`);
  }
}
