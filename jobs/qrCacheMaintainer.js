// 📦 qrCacheMaintainer.js | FINAL GODMODE IMMORTAL v999999999999x

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";

import {
  generateFullQrCache,
  initQrCacheDir,
  validateQrFallbacks
} from "../utils/qrCacheManager.js";

import {
  FALLBACK_DIR,
  sanitizeAmount,
  normalizeSymbol,
  getAmountFilename
} from "../utils/fallbackPathUtils.js";

import { sendAdminPing } from "../core/handlers/paymentHandler.js";
import { getAllQrScenarios } from "../utils/qrScenarios.js";
import { WALLETS } from "../config/config.js";
import { fetchCryptoPrice } from "../utils/fetchCryptoPrice.js";

const MAX_AGE_MS = 60 * 60 * 1000;      // 1h expiry for fallback PNGs
const INTERVAL_HOURS = 4;              // Repeat interval
let isRunning = false;                 // Prevent overlapping executions

/**
 * 🟢 Start the recurring QR maintenance engine
 */
export function startQrCacheMaintenance() {
  console.log(`🛠️ [qrCacheMaintainer] Scheduled every ${INTERVAL_HOURS}h`);
  setTimeout(() => scheduleMaintenance(true), 3 * 60 * 1000); // First run after 3min
  setInterval(() => scheduleMaintenance(false), INTERVAL_HOURS * 60 * 60 * 1000);
}

/**
 * 🔁 Schedule fallback refresh (startup or interval)
 */
function scheduleMaintenance(isStartup = false) {
  if (isRunning) {
    console.log("⏳ [qrCacheMaintainer] Skipping – already running.");
    return;
  }

  isRunning = true;

  tryMaintain(isStartup)
    .catch(err => {
      console.error(`❌ [qrCacheMaintainer] Failed: ${err.message}`);
    })
    .finally(() => {
      isRunning = false;
    });
}

/**
 * 🔧 Run full QR fallback maintenance cycle
 */
async function tryMaintain(isStartup = false) {
  const label = isStartup
    ? "🔄 QR fallback maintenance on bot startup"
    : "♻️ QR fallback cache auto-maintained (every 4h)";
  const now = new Date().toLocaleTimeString("en-GB");

  try {
    console.log(`🧹 [qrCacheMaintainer] Cleaning expired fallback PNGs...`);
    await initQrCacheDir();
    const deletedCount = await cleanExpiredQRCodes();

    const expected = await getExpectedQrCount();
    console.log(`🚀 [qrCacheMaintainer] Regenerating ${expected} QR fallbacks...`);
    await generateFullQrCache(true);

    console.log(`🔍 [qrCacheMaintainer] Validating fallback files...`);
    await validateQrFallbacks(true);

    console.log(`✅ [qrCacheMaintainer] Done. QR cache valid and refreshed.`);
    await sendAdminPing(`✅ ${label}\n🗑️ Expired cleaned: *${deletedCount}*\n📦 Regenerated: *${expected}*`);

  } catch (err) {
    console.error(`❌ [qrCacheMaintainer] Critical error: ${err.message}`);
    try {
      await sendAdminPing(`❌ QR fallback maintenance failed: *${err.message}*`);
    } catch (e) {
      console.warn("⚠️ [Admin ping failed]:", e.message);
    }
  }
}

/**
 * 🗑️ Delete expired QR PNGs from fallback cache
 */
async function cleanExpiredQRCodes() {
  try {
    const now = Date.now();
    const files = await fs.readdir(FALLBACK_DIR);
    const targets = files.filter(f => f.endsWith(".png"));

    const deletedEntries = [];

    for (const file of targets) {
      const fullPath = path.join(FALLBACK_DIR, file);
      try {
        const stats = await fs.stat(fullPath);
        const age = now - stats.mtimeMs;

        if (age > MAX_AGE_MS) {
          await fs.unlink(fullPath);
          deletedEntries.push({
            "🗑️ File": file,
            "⏱️ Age (min)": Math.floor(age / 60000),
            "📂 Path": fullPath
          });
        }
      } catch (err) {
        console.warn(`⚠️ [QR Cleaner] Failed to check ${file}: ${err.message}`);
      }
    }

    if (deletedEntries.length > 0) {
      console.table(deletedEntries.slice(0, 10));
      if (deletedEntries.length > 10) {
        console.log(`...and ${deletedEntries.length - 10} more expired QR files removed.`);
      }
    }

    console.log(`✅ [QR Cleaner] ${deletedEntries.length} expired PNGs removed.`);
    return deletedEntries.length;

  } catch (err) {
    console.error(`❌ [QR Cleaner] Failed: ${err.message}`);
    return 0;
  }
}

/**
 * 📊 Get current expected QR fallback count
 */
async function getExpectedQrCount() {
  const scenarios = await getAllQrScenarios();
  return scenarios.length;
}
