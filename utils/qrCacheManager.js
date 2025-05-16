// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v2.0.0•GODMODE•SYNC•LOCKED•SCENARIOCORE

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import PQueue from "p-queue";
import { generateQR, normalizeSymbol } from "./generateQR.js";
import { fetchCryptoPrice } from "./fetchCryptoPrice.js";
import { sanitizeAmount } from "./fallbackPathUtils.js";
import { getAllQrScenarios } from "./qrScenarios.js";

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

  const allTasks = getAllQrScenarios().map(scenario => ({
    ...scenario,
    normalized: normalizeSymbol(scenario.rawSymbol)
  }));

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

  console.table(
    [...successful].slice(0, 10).map((f, i) => ({
      "#": i + 1,
      "✅ FILE": path.basename(f),
      "📁 PATH": f
    }))
  );
  if (successful.size > 10) {
    console.log(`...and ${successful.size - 10} more.`);
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

export async function validateQrFallbacks(autoFix = true) {
  try {
    const dir = "qr-cache";
    const files = await fs.readdir(dir);
    const pngs = files.filter(f => f.endsWith(".png"));
    const expected = getAllQrScenarios();
    const totalExpected = expected.length;

    const expectedMap = new Map();
    for (const s of expected) {
      const normalized = normalizeSymbol(s.rawSymbol);
      const key = `${normalized}_${sanitizeAmount(s.totalUSD / 1).toFixed(6)}`; // Dummy div to format float
      expectedMap.set(key, s);
    }

    const corrupt = [];
    const missing = [];

    for (const [key] of expectedMap) {
      const file = `qr-cache/${key}.png`;
      const full = path.resolve(file);
      try {
        const buffer = await fs.readFile(full);
        if (!Buffer.isBuffer(buffer) || buffer.length < 1000) corrupt.push({ file, key });
      } catch {
        missing.push({ file, key });
      }
    }

    const validCount = totalExpected - corrupt.length - missing.length;
    console.log(`📊 QR Validation: ${validCount}/${totalExpected} valid`);

    if ((corrupt.length > 0 || missing.length > 0) && autoFix) {
      const toFix = [...corrupt, ...missing];
      console.warn(`♻️ Attempting regeneration of ${toFix.length} missing/corrupt QRs...`);
      const queue = new PQueue({ concurrency: MAX_CONCURRENCY });

      for (const { key } of toFix) {
        const [symbol, amtRaw] = key.split("_");
        const amount = sanitizeAmount(parseFloat(amtRaw));
        if (!amount || isNaN(amount) || amount <= 0) continue;
        queue.add(async () => {
          try {
            const buffer = await generateQR(symbol, amount);
            if (!buffer || buffer.length < 1000) {
              console.warn(`❌ Invalid regenerated QR: ${symbol} ${amount}`);
              return;
            }
            const out = path.resolve("qr-cache", `${symbol}_${amount.toFixed(6)}.png`);
            await fs.writeFile(out, buffer);
            console.log(`✅ Regenerated: ${symbol} ${amount}`);
          } catch (err) {
            console.warn(`❌ Failed to regenerate: ${symbol} ${amount} → ${err.message}`);
          }
        });
      }

      await queue.onIdle();
      console.log(`🧬 Auto-regeneration complete.`);
    } else {
      console.log("✅ All QR fallback files are valid.");
    }
  } catch (err) {
    console.error(`❌ QR fallback validation failed: ${err.message}`);
  }
}
