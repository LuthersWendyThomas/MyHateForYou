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
  await cleanQrCacheDir();

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
  console.log(`🚀 [QR Cache] Generating *${totalCount}* fallback QR scenarios...`);

  const successful = new Set();
  let pending = [...allTasks];
  let cycle = 0;

  while (pending.length > 0 && cycle < 10) {
    cycle++;
    console.log(`🔁 [Cycle ${cycle}] Pending: ${pending.length}...`);

    const queue = new PQueue({ concurrency: MAX_CONCURRENCY });
    const failed = [];

    for (let i = 0; i < pending.length; i++) {
      const task = pending[i];
      const index = totalCount - pending.length + i + 1;
      queue.add(() =>
        attemptGenerate({ ...task, index, totalCount }, successful, failed).catch(err => {
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

async function attemptGenerate({ rawSymbol, totalUSD, normalized, index, totalCount }, successful, failed) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const rate = await fetchCryptoPrice(rawSymbol);
      if (!rate || rate <= 0) throw new Error(`Invalid rate: ${rate}`);

      const amount = sanitizeAmount(totalUSD / rate);
      if (!amount || amount <= 0) throw new Error(`Invalid amount: ${amount}`);

      const fileName = `qr-cache/${normalized}_${amount.toFixed(6)}.png`;
      const absPath = path.resolve(fileName);

      if (existsSync(absPath)) {
        const buffer = await fs.readFile(absPath);
        if (Buffer.isBuffer(buffer) && buffer.length >= 1000) {
          console.log(`⏭️ [${index}/${totalCount}] Already exists: ${fileName}`);
          successful.add(fileName);
          return;
        } else {
          await fs.unlink(absPath);
          console.warn(`♻️ [${index}/${totalCount}] Rewriting invalid: ${normalized} $${totalUSD} → ${amount}`);
        }
      }

      const buffer = await generateQR(normalized, amount);
      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 1000) {
        throw new Error("Invalid QR buffer");
      }

      await fs.writeFile(absPath, buffer);
      successful.add(fileName);
      console.log(`✅ [${index}/${totalCount}] ${normalized} $${totalUSD} → ${amount}`);
      return;

    } catch (err) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`⏳ [${index}/${totalCount}] Retry #${attempt + 1} → ${normalized} $${totalUSD} → ${err.message}`);
      await sleep(delay);
    }
  }

  failed.push({ rawSymbol, totalUSD, normalized });
}

export async function validateQrFallbacks(autoFix = true) {
  try {
    const dir = "qr-cache";
    const files = await fs.readdir(dir);
    const pngs = files.filter(f => f.endsWith(".png"));
    const corrupt = [];

    for (const file of pngs) {
      const fullPath = path.join(dir, file);
      try {
        const buffer = await fs.readFile(fullPath);
        if (!Buffer.isBuffer(buffer) || buffer.length < 1000) {
          corrupt.push(file);
        }
      } catch {
        corrupt.push(file);
      }
    }

    const validCount = pngs.length - corrupt.length;
    console.log(`📊 QR Validation: ${validCount} valid / ${pngs.length} total`);

    if (corrupt.length > 0) {
      console.warn(`❌ Corrupt files: ${corrupt.length}`);
      if (autoFix) {
        console.warn("♻️ Attempting auto-regeneration of corrupt QRs...");
        const tasks = corrupt.map(name => {
          const [symbol, amtRaw] = name.replace(".png", "").split("_");
          const amount = sanitizeAmount(parseFloat(amtRaw));
          if (!amount || isNaN(amount) || amount <= 0) return null;
          return { rawSymbol: symbol, totalUSD: null, normalized: symbol, amount };
        }).filter(Boolean);

        const queue = new PQueue({ concurrency: MAX_CONCURRENCY });
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          queue.add(async () => {
            const buffer = await generateQR(task.normalized, task.amount);
            const out = path.resolve("qr-cache", `${task.normalized}_${sanitizeAmount(task.amount).toFixed(6)}.png`);
            if (buffer && buffer.length >= 1000) await fs.writeFile(out, buffer);
          });
        }

        await queue.onIdle();
        console.log(`✅ Auto-regeneration of corrupt QRs complete.`);
      }
    } else {
      console.log("✅ All QR fallback files are valid.");
    }
  } catch (err) {
    console.error(`❌ Fallback QR validation failed: ${err.message}`);
  }
}
