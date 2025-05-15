// 📦 jobs/qrCacheMaintainer.js | IMMORTAL FINAL v999999999.∞•CLEAN+REFRESH•SKYLOCK

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { generateFullQrCache } from "../utils/qrCacheManager.js";
import { sendAdminPing } from "../core/handlers/paymentHandler.js";

const CACHE_DIR = "qr-cache";
const MAX_AGE_MS = 60 * 60 * 1000; // 1h
const INTERVAL_HOURS = 4;

export function startQrCacheMaintenance() {
  console.log(`🛠️ [qrCacheMaintainer] Starting QR fallback maintenance every ${INTERVAL_HOURS}h`);
  tryMaintain(true);
  setInterval(() => tryMaintain(false), INTERVAL_HOURS * 60 * 60 * 1000);
}

async function tryMaintain(isStartup = false) {
  const now = new Date().toLocaleTimeString("en-GB");
  const label = isStartup
    ? "🔄 QR fallback maintenance on bot startup."
    : "♻️ QR fallback cache auto-maintained (every 4h).";

  try {
    console.log(`🧹 [qrCacheMaintainer] Cleaning expired QR files...`);
    await cleanExpiredQRCodes();
    console.log(`🚀 [qrCacheMaintainer] Refreshing fallback cache at ${now}...`);
    await generateFullQrCache();
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
    const files = await fs.readdir(CACHE_DIR);
    const targets = files.filter(f => f.endsWith(".png"));

    let deleted = 0;

    for (const file of targets) {
      const fullPath = path.join(CACHE_DIR, file);
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
