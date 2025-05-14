// 📦 jobs/refreshQrCache.js | IMMORTAL FINAL v1.3.0•DIAMONDLOCK•FALLBACKSYNCFIXED
// HOURLY QR CACHE REFRESH • CRYPTO RATES SYNC • ADMIN PING • 24/7 ULTRA BULLETPROOF ENGINE

import { refreshQrCache, initQrCacheDir } from "../utils/qrCacheManager.js"; // ✅ Now includes dir prep
import { sendAdminPing } from "../core/handlers/paymentHandler.js";          // ✅ Central admin alert system

/**
 * 🔁 Starts fallback QR cache engine:
 * – Runs immediately on startup
 * – Then refreshes every hour
 */
export function startQrCacheRefresher() {
  console.log("🕒 [refreshQrCache] QR refresher initialized — running every 60 minutes");

  // 🔄 Boot-time fallback PNG generator
  tryRefresh(true);

  // ♻️ Hourly regeneration
  setInterval(() => tryRefresh(false), 60 * 60 * 1000);
}

/**
 * ♻️ Attempts full refresh with logging and admin alert
 * @param {boolean} isStartup — triggered at startup
 */
async function tryRefresh(isStartup = false) {
  const label = isStartup
    ? "🔄 QR fallback cache regenerated on startup."
    : "🔁 QR fallback cache regenerated (hourly).";
  const now = new Date().toLocaleTimeString("en-GB");

  try {
    console.log(`♻️ [refreshQrCache] Refreshing fallback cache at ${now} (${isStartup ? "boot" : "hourly"})`);
    await initQrCacheDir(); // 🧱 Ensure dir exists (bulletproof)
    await refreshQrCache(); // 💾 Triggers generateFullQrCache()
    console.log("✅ [refreshQrCache] Fallback QR cache fully rebuilt.");
    await sendAdminPing(label);
  } catch (err) {
    console.error("❌ [refreshQrCache] Refresh failed:", err.message);
  }
}
