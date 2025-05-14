// 📦 jobs/refreshQrCache.js | IMMORTAL FINAL v2.1.1•DIAMONDLOCK•RETRYFIXED
// 4-HOURLY FALLBACK QR REFRESH • FULLY SYNCED WITH IMMORTAL FINAL v3.1.0 qrCacheManager.js

import { refreshQrCache } from "../utils/qrCacheManager.js";
import { sendAdminPing } from "../core/handlers/paymentHandler.js";

/**
 * 🚀 Starts the QR cache refresh scheduler
 * - Runs immediately on startup
 * - Then every 4 hours
 */
export function startQrCacheRefresher() {
  console.log("🕒 [refreshQrCache] QR refresher initialized — running every 4 hours");

  // 🔄 Initial boot refresh
  tryRefresh(true);

  // ♻️ Scheduled every 4h (14400000 ms)
  setInterval(() => tryRefresh(false), 4 * 60 * 60 * 1000);
}

/**
 * 🔁 Triggers full fallback QR refresh
 * @param {boolean} isStartup - true if run on boot
 */
async function tryRefresh(isStartup = false) {
  const now = new Date().toLocaleTimeString("en-GB");
  const label = isStartup
    ? "🔄 QR fallback cache generated on bot startup."
    : "♻️ QR fallback cache refreshed (4h interval).";

  try {
    console.log(`♻️ [refreshQrCache] Started at ${now} (${isStartup ? "startup" : "interval"})`);
    await refreshQrCache(); // 🚀 This handles dir init + full retry-safe build
    console.log("✅ [refreshQrCache] QR fallback cache rebuilt.");
    await sendAdminPing(label);
  } catch (err) {
    console.error("❌ [refreshQrCache] Refresh failed:", err.message);
  }
}
