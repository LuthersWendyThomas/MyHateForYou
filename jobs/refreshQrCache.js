// 📦 jobs/refreshQrCache.js | IMMORTAL FINAL v2.1.0•AMOUNTLOCK•4H•SYNCED
// 4-HOURLY FALLBACK QR CACHE REFRESH • SYNCED WITH generateQR.js + qrCacheManager.js

import { refreshQrCache, initQrCacheDir } from "../utils/qrCacheManager.js";
import { sendAdminPing } from "../core/handlers/paymentHandler.js";

/**
 * 🚀 Starts the QR cache refresh scheduler
 * - Runs once on bot startup
 * - Then every 4 hours (14400000 ms)
 */
export function startQrCacheRefresher() {
  console.log("🕒 [refreshQrCache] QR refresher initialized — running every 4 hours");

  // 🔄 Run immediately on boot
  tryRefresh(true);

  // ♻️ Schedule for every 4 hours
  setInterval(() => tryRefresh(false), 4 * 60 * 60 * 1000); // = 14,400,000 ms
}

/**
 * 🔁 Refresh cache and notify admin
 * @param {boolean} isStartup - true if it's the first run
 */
async function tryRefresh(isStartup = false) {
  const now = new Date().toLocaleTimeString("en-GB");
  const label = isStartup
    ? "🔄 QR fallback cache generated on startup."
    : "♻️ QR fallback cache auto-refreshed (every 4h).";

  try {
    console.log(`♻️ [refreshQrCache] Refresh started at ${now} (${isStartup ? "startup" : "interval"})`);
    await initQrCacheDir();
    await refreshQrCache();
    console.log("✅ [refreshQrCache] Fallback QR cache fully rebuilt.");
    await sendAdminPing(label);
  } catch (err) {
    console.error("❌ [refreshQrCache] Refresh failed:", err.message);
  }
}
