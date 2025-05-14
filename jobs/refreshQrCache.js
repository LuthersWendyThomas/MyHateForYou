// 📦 jobs/refreshQrCache.js | IMMORTAL FINAL v1.1.1•999999x•GODMODE•SYNCLOCK
// HOURLY QR CACHE REFRESH • CRYPTO RATES SYNC • ADMIN PING • 24/7 ULTRA BULLETPROOF ENGINE

import { generateFullQrCache } from "../utils/qrCacheManager.js";
import { sendAdminPing } from "../core/handlers/paymentHandler.js";

/**
 * 🔁 Starts the QR cache refresher engine.
 * Triggers on boot, and repeats every 60 minutes.
 */
export function startQrCacheRefresher() {
  console.log("🕒 [refreshQrCache] QR refresher initialized — running every 60 minutes");

  // 🟢 Immediate run on startup
  tryRefresh(true);

  // ♻️ Hourly refresh loop
  setInterval(() => tryRefresh(false), 60 * 60 * 1000);
}

/**
 * ♻️ Executes QR cache regeneration with logging and admin notification
 * @param {boolean} isStartup — whether this is the first (boot) execution
 */
async function tryRefresh(isStartup = false) {
  const label = isStartup
    ? "🔄 QR cache atnaujintas paleidimo metu."
    : "🔁 QR cache atnaujintas (valandinis).";
  const now = new Date().toLocaleTimeString("en-GB");

  try {
    console.log(`♻️ [refreshQrCache] Starting refresh at ${now} (${isStartup ? "boot" : "hourly"})`);
    await generateFullQrCache();
    console.log("✅ [refreshQrCache] QR cache fully regenerated.");
    await sendAdminPing(label);
  } catch (err) {
    console.error("❌ [refreshQrCache] Failed:", err.message);
  }
}
