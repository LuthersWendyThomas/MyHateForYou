// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v1.0.3•DIAMONDLOCK•520xFORCEOVERWRITE

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

export async function generateFullQrCache(forceComplete = true) {
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

  const totalCount = allTasks.length;
  console.log(`🚀 [QR Cache] Forcing generation of *${totalCount}* fallback QR codes...`);

  const successful = new Set();
  let pending = [...allTasks];
  let cycle = 0;

  while (pending.length > 0 && cycle < 10) {
    cycle++;
    console.log(`🔁 [Cycle ${cycle}] Pending: ${pending.length}...`);

    const queue = new PQueue({ concurrency: MAX_CONCURRENCY });
    const failed = [];
    const offset = totalCount - pending.length;

    for (let i = 0; i < pending.length; i++) {
      const task = pending[i];
      const index = offset + i + 1;
      queue.add(() =>
        attemptForceGenerate({ ...task, index, total: totalCount }, successful, failed).catch(err => {
          console.warn(`❌ [queueTaskFailed] ${task.normalized} $${task.totalUSD}: ${err.message}`);
          failed.push(task);
        })
      );
    }

    await queue.onIdle();
    pending = failed;

    if (!forceComplete) break;
  }

  const successList = [...successful].map((f, i) => ({
    "#": i + 1,
    "✅ FILE": path.basename(f),
    "📁 PATH": f
  }));

  console.table(successList.slice(0, 10));
  if (successList.length > 10) {
    console.log(`...and ${successList.length - 10} more.`);
  }

  console.log(`🎯 [DONE] QR fallback generation: ${successful.size}/${totalCount}`);
  if (successful.size < totalCount) {
    console.warn(`⚠️ Still missing: ${totalCount - successful.size} PNGs.`);
  } else {
    console.log(`💎 All ${totalCount} fallback QR codes successfully generated!`);
  }
}

async function attemptForceGenerate({ rawSymbol, totalUSD, normalized, index, total }, successful, failed) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const rate = await fetchCryptoPrice(rawSymbol);
      if (!rate || rate <= 0) throw new Error(`Invalid rate: ${rate}`);

      const amount = sanitizeAmount(totalUSD / rate);
      if (!amount || amount <= 0) throw new Error(`Invalid amount: ${amount}`);

      const fileName = `qr-cache/${normalized}_${amount.toFixed(6)}.png`;
      const absPath = path.resolve(fileName);

      // Always delete old file, force regenerate
      if (existsSync(absPath)) {
        await fs.unlink(absPath);
        console.log(`♻️ [${index}/${total}] Overwriting: ${fileName}`);
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
      console.warn(`⏳ [${index}/${total}] Retry #${attempt + 1} → ${normalized} $${totalUSD} → ${err.message}`);
      await sleep(delay);
    }
  }

  failed.push({ rawSymbol, totalUSD, normalized });
}
