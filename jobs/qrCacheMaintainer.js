// 📦 utils/qrCacheMaintainer.js | FINAL IMMORTAL v3.0.0•GODMODE•MAINTENANCE

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateFullQrCache, initQrCacheDir, validateQrFallbacks } from "../utils/qrCacheManager.js"; // Tikslūs importai
import { FALLBACK_DIR, sanitizeAmount, normalizeSymbol, getAmountFilename } from "../utils/fallbackPathUtils.js"; // Užtikriname, kad kelias į fallback dir būtų teisingas
import { sendAdminPing } from "../core/handlers/paymentHandler.js";
import { getExpectedQrCount } from "../utils/qrScenarios.js"; // ✅ FIXED: naudoti tiesos šaltinį

// Importuojame NETWORKS iš config/networkConfig.js
import { NETWORKS } from "../config/networkConfig.js"; // Import NETWORKS for currency symbol handling
import { WALLETS } from "../config/config.js"; // WALLETS import for address resolution
import { fetchCryptoPrice } from "../utils/fetchCryptoPrice.js"; // Importuojame fetchCryptoPrice iš fetchCryptoPrice.js, kad gauti kriptovaliutų kursus

const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const INTERVAL_HOURS = 4;

let isRunning = false;

export function startQrCacheMaintenance() {
  console.log(`🛠️ [qrCacheMaintainer] QR fallback maintenance scheduled every ${INTERVAL_HOURS}h`);
  setTimeout(() => scheduleMaintenance(true), 3 * 60 * 1000); // Delay on boot (3 minutes)
  setInterval(() => scheduleMaintenance(false), INTERVAL_HOURS * 60 * 60 * 1000);
}

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

async function tryMaintain(isStartup = false) {
  const now = new Date().toLocaleTimeString("en-GB");
  const label = isStartup
    ? "🔄 QR fallback maintenance on bot startup."
    : "♻️ QR fallback cache auto-maintained (every 4h).";

  try {
    console.log(`🧹 [qrCacheMaintainer] Ensuring cache dir + cleaning expired PNGs...`);
    await initQrCacheDir();
    const deletedCount = await cleanExpiredQRCodes();

    const expected = await getExpectedQrCount(); // ✅ FIXED: teisingas vienintelis šaltinis

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
