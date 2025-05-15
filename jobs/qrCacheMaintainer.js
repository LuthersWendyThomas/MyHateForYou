// 📦 jobs/qrCacheMaintainer.js | IMMORTAL FINAL v999999999.∞•FULLSYNC•REQUEUE•SAFEBOOT•LOCKED

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateFullQrCache, initQrCacheDir } from "../utils/qrCacheManager.js";
import { FALLBACK_DIR } from "../utils/fallbackPathUtils.js";
import { sendAdminPing } from "../core/handlers/paymentHandler.js";

const MAX_AGE_MS = 60 * 60 * 1000; // 1h
const INTERVAL_HOURS = 4;

let isRunning = false;

export function startQrCacheMaintenance() {
  console.log(`🛠️ [qrCacheMaintainer] Starting QR fallback maintenance every ${INTERVAL_HOURS}h`);
  scheduleMaintenance(true);
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
    await cleanExpiredQRCodes();

    console.log(`🚀 [qrCacheMaintainer] Regenerating full QR fallback cache at ${now}...`);
    await generateFullQrCache(); // ensures 520x fallback regeneration

    console.log(`✅ [qrCacheMaintainer] All fallback QRs reloaded.`);
    await sendAdminPing(`✅ ${label}`);
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
    const files = await fs.readdir(FALLBACK_DIR); // ✅ FIXED: use global fallback dir
    const targets = files.filter(f => f.endsWith(".png"));

    let deleted = 0;
    for (const file of targets) {
      const fullPath = path.join(FALLBACK_DIR, file);
      const stats = await fs.stat(fullPath);
      const age = now - stats.mtimeMs;

      if (age > MAX_AGE_MS) {
        await fs.unlink(fullPath);
        deleted++;
        console.log(`🗑️ [QR Cleaner] Deleted expired: ${file}`);
      }
    }

    console.log(`✅ [QR Cleaner] ${deleted} expired QR files removed.`);
  } catch (err) {
    console.error(`❌ [QR Cleaner] Failed: ${err.message}`);
  }
}
