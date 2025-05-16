// 📦 utils/qrCacheMaintainer.js | FINAL IMMORTAL v3.0.0•GODMODE•MAINTENANCE

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateFullQrCache, initQrCacheDir, validateQrFallbacks } from "../utils/qrCacheManager.js"; // Correct imports for cache management
import { FALLBACK_DIR, sanitizeAmount, normalizeSymbol, getAmountFilename } from "../utils/fallbackPathUtils.js"; // Importing helpers from fallbackPathUtils
import { sendAdminPing } from "../core/handlers/paymentHandler.js"; // To send admin notifications
import { getExpectedQrCount } from "../utils/qrScenarios.js"; // Importing the scenario data from qrScenarios.js

// Importing necessary elements for rate fetching and wallet address resolution
import { NETWORKS } from "../config/networkConfig.js"; // To use NETWORKS for currency symbol handling
import { WALLETS } from "../config/config.js"; // Importing wallet addresses from config
import { fetchCryptoPrice } from "../utils/fetchCryptoPrice.js"; // Importing the fetchCryptoPrice module to get the latest crypto prices

const MAX_AGE_MS = 60 * 60 * 1000; // Maximum age of 1 hour for cache expiration
const INTERVAL_HOURS = 4; // Cache will be cleaned and regenerated every 4 hours

let isRunning = false; // Prevent overlapping maintenance tasks

/**
 * Start QR cache maintenance process
 */
export function startQrCacheMaintenance() {
  console.log(`🛠️ [qrCacheMaintainer] QR fallback maintenance scheduled every ${INTERVAL_HOURS}h`);
  setTimeout(() => scheduleMaintenance(true), 3 * 60 * 1000); // Start maintenance 3 minutes after startup
  setInterval(() => scheduleMaintenance(false), INTERVAL_HOURS * 60 * 60 * 1000); // Repeat every INTERVAL_HOURS
}

/**
 * Schedule maintenance task to run if it's not already running
 * @param {boolean} isStartup - Flag to indicate if this is the startup task
 */
function scheduleMaintenance(isStartup = false) {
  if (isRunning) {
    console.log("⏳ [qrCacheMaintainer] Skipping: previous maintenance still in progress.");
    return;
  }

  isRunning = true;
  tryMaintain(isStartup)
    .catch(err => {
      console.error(`❌ [qrCacheMaintainer] Maintenance failure: ${err.message}`);
    })
    .finally(() => {
      isRunning = false;
    });
}

/**
 * Main maintenance process (cleaning and regenerating QR cache)
 * @param {boolean} isStartup - Flag indicating whether this is the startup maintenance
 */
async function tryMaintain(isStartup = false) {
  const now = new Date().toLocaleTimeString("en-GB");
  const label = isStartup
    ? "🔄 QR fallback maintenance on bot startup."
    : "♻️ QR fallback cache auto-maintained (every 4h).";

  try {
    console.log(`🧹 [qrCacheMaintainer] Ensuring cache dir + cleaning expired PNGs...`);
    await initQrCacheDir();
    const deletedCount = await cleanExpiredQRCodes();

    const expected = await getExpectedQrCount(); // Retrieve the expected QR count (fresh from the scenarios)

    console.log(`🚀 [qrCacheMaintainer] Regenerating fallback QR cache (${expected} total)...`);
    await generateFullQrCache(true);

    console.log(`🔍 [qrCacheMaintainer] Validating fallback QR files...`);
    await validateQrFallbacks(true);

    console.log(`✅ [qrCacheMaintainer] All fallback QRs regenerated and validated.`);
    await sendAdminPing(`✅ ${label}\n🗑️ Expired cleaned: *${deletedCount}*\n📦 ${expected} QRs regenerated + validated.`);
  } catch (err) {
    console.error(`❌ [qrCacheMaintainer] Error:`, err.message);
    try {
      await sendAdminPing(`❌ QR fallback maintenance failed: *${err.message}*`);
    } catch (e) {
      console.warn("⚠️ [Admin ping error]:", e.message);
    }
  }
}

/**
 * Clean expired QR codes from the fallback directory
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
        console.warn(`⚠️ [QR Cleaner] Stat/read fail for: ${file} → ${err.message}`);
      }
    }

    if (deletedEntries.length > 0) {
      console.table(deletedEntries.slice(0, 10));
      if (deletedEntries.length > 10) {
        console.log(`...and ${deletedEntries.length - 10} more expired QR files removed.`);
      }
    }

    console.log(`✅ [QR Cleaner] ${deletedEntries.length} expired QR files removed.`);
    return deletedEntries.length;
  } catch (err) {
    console.error(`❌ [QR Cleaner] Failed: ${err.message}`);
    return 0;
  }
}
