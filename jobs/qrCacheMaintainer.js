// 📦 utils/qrCacheMaintainer.js | FINAL IMMORTAL v3.0.0•GODMODE•MAINTENANCE

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateFullQrCache, initQrCacheDir, validateQrFallbacks } from "../utils/qrCacheManager.js"; // Importing QR Cache Management
import { FALLBACK_DIR, sanitizeAmount, normalizeSymbol, getAmountFilename } from "../utils/fallbackPathUtils.js"; // All necessary helpers for sanitization and file paths
import { sendAdminPing } from "../core/handlers/paymentHandler.js"; // Admin ping notifications
import { getExpectedQrCount } from "../utils/qrScenarios.js"; // Import for getting expected QR scenarios

// Importing fetchCryptoPrice and NETWORKS from fetchCryptoPrice.js for rate fetching and network symbols handling
import { NETWORKS } from "../utils/fetchCryptoPrice.js"; // For using NETWORKS
import { WALLETS } from "../config/config.js"; // WALLETS for address resolution
import { fetchCryptoPrice } from "../utils/fetchCryptoPrice.js"; // Import for fetching crypto prices

const MAX_AGE_MS = 60 * 60 * 1000; // Cache expires after 1 hour
const INTERVAL_HOURS = 4; // Cache maintenance happens every 4 hours

let isRunning = false; // Flag to prevent overlapping maintenance tasks

/**
 * Start the QR cache maintenance process
 */
export function startQrCacheMaintenance() {
  console.log(`🛠️ [qrCacheMaintainer] QR fallback maintenance scheduled every ${INTERVAL_HOURS}h`);
  setTimeout(() => scheduleMaintenance(true), 3 * 60 * 1000); // Start maintenance after a 3-minute delay
  setInterval(() => scheduleMaintenance(false), INTERVAL_HOURS * 60 * 60 * 1000); // Repeat every 4 hours
}

/**
 * Schedule maintenance if it's not already running
 * @param {boolean} isStartup - Flag to indicate if this is the startup maintenance
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
 * @param {boolean} isStartup - Flag indicating if this is the startup maintenance
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

    const expected = await getExpectedQrCount(); // Get the expected number of QR codes

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
