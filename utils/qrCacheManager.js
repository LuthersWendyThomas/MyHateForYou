// 📦 utils/qrCacheManager.js | IMMORTAL FINAL v3.1.0 • PLAN-C • NAMED-ONLY • BULLETPROOF

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import PQueue from "p-queue";
import { generateQR } from "./generateQR.js";
import {
  sanitizeAmount,
  getFallbackPathByScenario,
  FALLBACK_DIR
} from "./fallbackPathUtils.js";
import { getAllQrScenarios } from "./qrScenarios.js";

const MAX_CONCURRENCY = 10;
const MAX_RETRIES = 10;
const BASE_DELAY_MS = 3000;

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function attemptGenerate(scenario, index, total, successful, failed) {
  const filePath = getFallbackPathByScenario(
    scenario.rawSymbol,
    scenario.expectedAmount,
    scenario.category,
    scenario.productName,
    scenario.quantity
  );

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
        console.log(`♻️ [${index}/${total}] Overwriting: ${path.basename(filePath)}`);
      }

      const buffer = await generateQR(scenario.rawSymbol, scenario.expectedAmount);
      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 300) {
        throw new Error("Invalid QR buffer");
      }

      await fs.writeFile(filePath, buffer);
      successful.add(filePath);
      console.log(`✅ [${index}/${total}] ${scenario.rawSymbol} → ${scenario.expectedAmount}`);
      return;
    } catch (err) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`⏳ [${index}/${total}] Retry #${attempt + 1} → ${scenario.rawSymbol}: ${err.message}`);
      await sleep(delay);
    }
  }

  failed.push(scenario);
}

export async function initQrCacheDir() {
  if (!existsSync(FALLBACK_DIR)) {
    await fs.mkdir(FALLBACK_DIR, { recursive: true });
  }
}

export async function generateFullQrCache(forceComplete = true) {
  await initQrCacheDir();

  const scenarios = await getAllQrScenarios();
  const totalCount = scenarios.length;

  console.log(`🚀 [QR Cache] Generating ${totalCount} fallback QR codes...`);

  const successful = new Set();
  let pending = [...scenarios];
  let cycle = 0;

  let totalSuccess = 0;
  let totalFailures = 0;

  while (pending.length > 0 && cycle < 10) {
    cycle++;
    console.log(`🔁 [Cycle ${cycle}] Pending: ${pending.length}...`);

    const queue = new PQueue({ concurrency: MAX_CONCURRENCY });
    const failed = [];
    const offset = totalCount - pending.length;

    for (let i = 0; i < pending.length; i++) {
      const scenario = pending[i];
      const index = offset + i + 1;

      queue.add(async () => {
        await attemptGenerate(scenario, index, totalCount, successful, failed);
        if (!failed.includes(scenario)) totalSuccess++;
        else totalFailures++;
      });
    }

    await queue.onIdle();
    pending = failed;
    if (!forceComplete) break;
  }

  console.log(`📊 [QR Cache Summary]`);
  console.log(`✅ Total successful: ${totalSuccess}`);
  console.log(`❌ Total failed: ${totalFailures}`);
  console.log(`📂 Fallbacks generated: ${successful.size}`);
}

export async function validateQrFallbacks(autoFix = true) {
  try {
    const scenarios = await getAllQrScenarios();
    const expected = scenarios.length;

    const corrupt = [];
    const missing = [];

    for (const s of scenarios) {
      const filePath = getFallbackPathByScenario(
        s.rawSymbol,
        s.expectedAmount,
        s.category,
        s.productName,
        s.quantity
      );
      const filename = path.basename(filePath);

      try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile() || stat.size < 256) {
          console.warn(`⚠️ Stat fail or too small [${stat.size}B]: ${filename}`);
          await fs.unlink(filePath);
          corrupt.push({ ...s, filePath });
          continue;
        }

        const buffer = await fs.readFile(filePath);
        if (!Buffer.isBuffer(buffer) || buffer.length < 256) {
          console.warn(`⚠️ Corrupt buffer [${buffer?.length || 0}B]: ${filename}`);
          await fs.unlink(filePath);
          corrupt.push({ ...s, filePath });
        }
      } catch {
        missing.push({ ...s, filePath });
      }
    }

    const validCount = expected - corrupt.length - missing.length;

    console.log(`📊 QR Validation Summary:`);
    console.log(`✅ Valid: ${validCount}`);
    console.log(`❌ Corrupt: ${corrupt.length}`);
    console.log(`🚫 Missing: ${missing.length}`);
    console.log(`📂 Total expected: ${expected}`);

    if ((corrupt.length > 0 || missing.length > 0) && autoFix) {
      const toFix = [...corrupt, ...missing];
      console.warn(`♻️ Regenerating ${toFix.length} missing/corrupt files...`);

      const queue = new PQueue({ concurrency: MAX_CONCURRENCY });

      for (const s of toFix) {
        queue.add(async () => {
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const buffer = await generateQR(s.rawSymbol, s.expectedAmount);
              if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 256) {
                throw new Error(`Invalid buffer on attempt ${attempt + 1}`);
              }

              await fs.writeFile(s.filePath, buffer);
              console.log(`✅ Regenerated: ${path.basename(s.filePath)}`);
              return;
            } catch (err) {
              const delay = 1000 * (attempt + 1);
              console.warn(`⏳ Retry #${attempt + 1} for ${s.filePath} → ${err.message}`);
              await sleep(delay);
            }
          }

          console.warn(`❌ Final failure after retries: ${path.basename(s.filePath)}`);
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
