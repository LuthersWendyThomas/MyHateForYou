// 📦 utils/qrCacheManager.js | FINAL IMMORTAL v1.0.0•GODMODE•LOCKED•SYNCED•∞FALLBACK

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import PQueue from "p-queue";
import { generateQR, normalizeSymbol } from "./generateQR.js";
import { fetchCryptoPrice } from "./fetchCryptoPrice.js";
import {
  sanitizeAmount,
  getFallbackPath,
  FALLBACK_DIR
} from "./fallbackPathUtils.js";
import { getAllQrScenarios } from "./qrScenarios.js";

const MAX_CONCURRENCY = 10;
const MAX_RETRIES = 7;
const BASE_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function initQrCacheDir() {
  if (!existsSync(FALLBACK_DIR)) await fs.mkdir(FALLBACK_DIR, { recursive: true });
}

export async function cleanQrCacheDir() {
  try {
    const files = await fs.readdir(FALLBACK_DIR);
    const targets = files.filter(f => f.endsWith(".png"));
    for (const f of targets) await fs.unlink(path.join(FALLBACK_DIR, f));
    console.log(`🧹 [cleanQrCacheDir] Deleted ${targets.length} fallback PNGs.`);
  } catch (err) {
    console.warn("⚠️ [cleanQrCacheDir]", err.message);
  }
}

export async function generateFullQrCache(forceComplete = true) {
  await initQrCacheDir();

  const scenarios = getAllQrScenarios().map(s => ({
    ...s,
    normalized: normalizeSymbol(s.rawSymbol)
  }));

  const totalCount = scenarios.length;
  console.log(`🚀 [QR Cache] Generating ${totalCount} fallback QR codes...`);

  const successful = new Set();
  let pending = [...scenarios];
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
        attemptGenerate({ ...task, index, total: totalCount }, successful, failed).catch(err => {
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

  console.log(`🎯 [DONE] Generated: ${successful.size}/${totalCount}`);
  if (successful.size < totalCount) {
    console.warn(`⚠️ Still missing: ${totalCount - successful.size} PNGs.`);
  } else {
    console.log(`💎 All fallback QR codes successfully generated.`);
  }
}

async function attemptGenerate({ rawSymbol, totalUSD, normalized, index, total }, successful, failed) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const rate = await fetchCryptoPrice(rawSymbol);
      if (!rate || rate <= 0) throw new Error(`Invalid rate: ${rate}`);

      const amount = sanitizeAmount(totalUSD / rate);
      if (!amount || amount <= 0) throw new Error(`Invalid amount: ${amount}`);

      const filePath = getFallbackPath(normalized, amount);

      if (existsSync(filePath)) {
        await fs.unlink(filePath);
        console.log(`♻️ [${index}/${total}] Overwriting: ${path.basename(filePath)}`);
      }

      const buffer = await generateQR(normalized, amount);
      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 1000) {
        throw new Error("Invalid QR buffer");
      }

      await fs.writeFile(filePath, buffer);
      successful.add(filePath);
      console.log(`✅ [${index}/${total}] ${normalized} $${totalUSD} → ${amount}`);
      return;
    } catch (err) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`⏳ [${index}/${total}] Retry #${attempt + 1} → ${normalized}: ${err.message}`);
      await sleep(delay);
    }
  }

  failed.push({ rawSymbol, totalUSD, normalized });
}

export async function validateQrFallbacks(autoFix = true) {
  try {
    const files = await fs.readdir(FALLBACK_DIR);
    const pngs = files.filter(f => f.endsWith(".png"));
    const scenarios = getAllQrScenarios();
    const expected = scenarios.length;

    const expectedMap = new Map();
    for (const s of scenarios) {
      const normalized = normalizeSymbol(s.rawSymbol);
      const key = `${normalized}_${sanitizeAmount(s.totalUSD / 1).toFixed(6)}`; // Dummy division for float formatting
      expectedMap.set(key, s);
    }

    const corrupt = [];
    const missing = [];

    for (const [key] of expectedMap) {
      const filePath = path.resolve(FALLBACK_DIR, `${key}.png`);
      try {
        const buffer = await fs.readFile(filePath);
        if (!Buffer.isBuffer(buffer) || buffer.length < 1000) {
          corrupt.push({ key, filePath });
        }
      } catch {
        missing.push({ key, filePath });
      }
    }

    const validCount = expected - corrupt.length - missing.length;
    console.log(`📊 QR Validation: ${validCount}/${expected} valid`);

    if ((corrupt.length > 0 || missing.length > 0) && autoFix) {
      const toFix = [...corrupt, ...missing];
      console.warn(`♻️ Regenerating ${toFix.length} missing/corrupt files...`);

      const queue = new PQueue({ concurrency: MAX_CONCURRENCY });

      for (const { key } of toFix) {
        const [symbol, amtRaw] = key.split("_");
        const amount = sanitizeAmount(parseFloat(amtRaw));
        if (!amount || isNaN(amount) || amount <= 0) continue;

        queue.add(async () => {
          try {
            const buffer = await generateQR(symbol, amount);
            if (!buffer || buffer.length < 1000) {
              console.warn(`❌ Invalid QR: ${symbol} ${amount}`);
              return;
            }
            const outPath = getFallbackPath(symbol, amount);
            await fs.writeFile(outPath, buffer);
            console.log(`✅ Regenerated: ${symbol} ${amount}`);
          } catch (err) {
            console.warn(`❌ Regeneration failed: ${symbol} ${amount} → ${err.message}`);
          }
        });
      }

      await queue.onIdle();
      console.log(`🧬 Regeneration complete.`);
    } else {
      console.log("✅ All fallback QR codes are valid.");
    }
  } catch (err) {
    console.error(`❌ Validation failed: ${err.message}`);
  }
}
