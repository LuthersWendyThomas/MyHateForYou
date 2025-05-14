// 📦 jobs/refreshQrCache.js | IMMORTAL FINAL v1.2.0•DIAMONDLOCK•SYNCMASTER
// HOURLY QR CACHE REFRESH • CRYPTO RATES SYNC • ADMIN PING • 24/7 ULTRA BULLETPROOF ENGINE

import { refreshQrCache } from "../utils/qrCacheManager.js";          // ✅ 100% synced with fallback engine
import { sendAdminPing } from "../core/handlers/paymentHandler.js";   // ✅ Unified admin notifier

/**
 * 🔁 Starts the QR cache refresher engine.
 * Triggers on bot startup, then runs every 60 minutes automatically.
 */
export function startQrCacheRefresher() {
  console.log("🕒 [refreshQrCache] QR refresher initialized — running every 60 minutes");

  // 🔄 Initial boot-time refresh
  tryRefresh(true);

  // ♻️ Hourly refresh cycle
  setInterval(() => tryRefresh(false), 60 * 60 * 1000);
}

/**
 * ♻️ Executes full QR cache refresh with admin alert + logging
 * @param {boolean} isStartup — whether this is called on boot
 */
async function tryRefresh(isStartup = false) {
  const label = isStartup
    ? "🔄 QR cache atnaujintas paleidimo metu."
    : "🔁 QR cache atnaujintas (valandinis).";
  const now = new Date().toLocaleTimeString("en-GB");

  try {
    console.log(`♻️ [refreshQrCache] Starting refresh at ${now} (${isStartup ? "boot" : "hourly"})`);
    await refreshQrCache(); // ⬅ calls generateFullQrCache() internally
    console.log("✅ [refreshQrCache] QR cache fully regenerated.");
    await sendAdminPing(label);
  } catch (err) {
    console.error("❌ [refreshQrCache] Refresh failed:", err.message);
  }
}
