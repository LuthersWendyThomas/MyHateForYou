// 📦 utils/qrCacheManager.js | FINAL IMMORTAL v3.0.1 GODMODE MANAGER

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import PQueue from "p-queue";
import { generateQR } from "./generateQR.js"; // Importing generateQR for QR generation
import {
  sanitizeAmount,
  getFallbackPath,
  FALLBACK_DIR,
  normalizeSymbol,
  getAmountFilename
} from "./fallbackPathUtils.js"; // Import helpers for sanitation, normalization, and filename handling
import { getAllQrScenarios } from "./qrScenarios.js"; // Import qrScenarios.js for fetching all QR scenarios

import { NETWORKS } from "./fetchCryptoPrice.js"; // Use NETWORKS from fetchCryptoPrice.js for network rates
import { WALLETS } from "../config/config.js"; // WALLETS from config for wallet address resolution

const MAX_CONCURRENCY = 2;      // 🔒 Minimalus, kad neperkrautų CPU / disk I/O / rate limitų
const MAX_RETRIES = 10;         // ♻️ Daugiau šansų kiekvienam scenarijui
const BASE_DELAY_MS = 3000;     // 🛡️ Stabilesnis backoff’as (apie 3s → 6s → 12s → 24s... iki ~30s)

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// Attempt to generate QR and handle fallback if necessary
async function attemptGenerate({ rawSymbol, expectedAmount, filename, index, total }, successful, failed) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const filePath = path.join(FALLBACK_DIR, filename);

      if (existsSync(filePath)) {
        await fs.unlink(filePath);
        console.log(`♻️ [${index}/${total}] Overwriting: ${filename}`);
      }

      const buffer = await generateQR(rawSymbol, expectedAmount);
      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 300) {
        throw new Error("Invalid QR buffer");
      }

      try {
        await fs.writeFile(filePath, buffer);
        successful.add(filePath);
        console.log(`✅ [${index}/${total}] ${rawSymbol} → ${expectedAmount}`);
        return;
      } catch (err) {
        throw new Error(`❌ Failed to write QR fallback: ${filename} → ${err.message}`);
      }

    } catch (err) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`⏳ [${index}/${total}] Retry #${attempt + 1} → ${rawSymbol}: ${err.message}`);
      await sleep(delay);
    }
  }

  failed.push({ rawSymbol, expectedAmount, filename });
}

// Initialize QR cache directory if it doesn't exist
export async function initQrCacheDir() {
  if (!existsSync(FALLBACK_DIR)) {
    await fs.mkdir(FALLBACK_DIR, { recursive: true });
  }
}

// Clean up expired QR codes from the cache directory
export async function cleanQrCacheDir() {
  try {
    const files = await fs.readdir(FALLBACK_DIR);
    const targets = files.filter(f => f.endsWith(".png"));
    for (const f of targets) {
      await fs.unlink(path.join(FALLBACK_DIR, f));
    }
    console.log(`🧹 [cleanQrCacheDir] Deleted ${targets.length} fallback PNGs.`);
  } catch (err) {
    console.warn("⚠️ [cleanQrCacheDir]", err.message);
  }
}

// Generate full QR cache (either forced or based on existing scenarios)
export async function generateFullQrCache(forceComplete = true) {
  await initQrCacheDir();

  const scenarios = await getAllQrScenarios(); // Get all the QR scenarios from the source of truth
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
      const scenario = pending[i];
      const index = offset + i + 1;

      queue.add(() =>
        attemptGenerate({ ...scenario, index, total: totalCount }, successful, failed).catch(err => {
          console.warn(`❌ [queueTaskFailed] ${scenario.filename}: ${err.message}`);
          failed.push(scenario);
        })
      );
    }

    await queue.onIdle();
    pending = failed;
    if (!forceComplete) break;
  }
}

export async function validateQrFallbacks(autoFix = true) {
  try {
    const files = await fs.readdir(FALLBACK_DIR);
    const pngs = files.filter(f => f.endsWith(".png"));
    const scenarios = await getAllQrScenarios();
    const expected = scenarios.length;

    const expectedSet = new Set(scenarios.map(s => s.filename));
    const foundSet = new Set(pngs);
    const corrupt = [];
    const missing = [];

    for (const filename of expectedSet) {
      const filePath = path.join(FALLBACK_DIR, filename);
      try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile() || stat.size < 300) {
          console.warn(`⚠️ Stat fail or too small [${stat.size}B]: ${filename}`);
          await fs.unlink(filePath);
          corrupt.push({ filename, filePath });
          continue;
        }

        const buffer = await fs.readFile(filePath);
        if (!Buffer.isBuffer(buffer) || buffer.length < 300) {
          console.warn(`⚠️ Corrupt buffer [${buffer?.length || 0}B]: ${filename}`);
          await fs.unlink(filePath);
          corrupt.push({ filename, filePath });
        }
      } catch {
        missing.push({ filename, filePath });
      }
    }

    const trulyMissing = [...expectedSet].filter(f => !foundSet.has(f));
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

      for (const { filename } of toFix) {
        const [symbol, amtRaw] = filename.replace(".png", "").split("_");
        const amount = sanitizeAmount(parseFloat(amtRaw));
        if (!amount || isNaN(amount) || amount <= 0) continue;

        queue.add(async () => {
          try {
            const buffer = await generateQR(symbol, amount);
            if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 300) {
              console.warn(`❌ Invalid regenerated buffer: ${symbol} ${amount}`);
              return;
            }

            const filePath = path.join(FALLBACK_DIR, filename);
            try {
              await fs.writeFile(filePath, buffer);
              console.log(`✅ Regenerated: ${symbol} ${amount}`);
            } catch (writeErr) {
              console.warn(`❌ Failed to write QR: ${filename} → ${writeErr.message}`);
            }
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
