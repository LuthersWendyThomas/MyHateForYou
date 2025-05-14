// 📦 jobs/refreshQrCache.js | IMMORTAL FINAL v3.2.0•DIAMONDLOCK•ULTRASYNC
// FULL 4-HOURLY FALLBACK QR REBUILDER • SYNCHRONIZED WITH qrCacheManager v3.2.0

import { refreshQrCache } from "../utils/qrCacheManager.js";
import { sendAdminPing } from "../core/handlers/paymentHandler.js";

/**
 * 🚀 Start QR fallback PNG refresher
 * - Triggers on startup
 * - Then every 4 hours (14400000 ms)
 */
export function startQrCacheRefresher() {
  console.log("🕒 [refreshQrCache] QR refresher initialized — running every 4 hours");

  // 🔄 Immediate full rebuild on boot
  tryRefresh(true);

  // ♻️ Every 4 hours
  setInterval(() => tryRefresh(false), 4 * 60 * 60 * 1000);
}

/**
 * 🔁 Attempt QR cache rebuild with admin ping
 * @param {boolean} isStartup - true = first boot, false = interval
 */
async function tryRefresh(isStartup = false) {
  const now = new Date().toLocaleTimeString("en-GB");
  const label = isStartup
    ? "🔄 QR fallback cache generated on bot startup."
    : "♻️ QR fallback cache auto-refreshed (every 4h).";

  try {
    console.log(`♻️ [refreshQrCache] Started at ${now} (${isStartup ? "startup" : "interval"})`);
    await refreshQrCache();
    console.log("✅ [refreshQrCache] Full PNG fallback cache rebuilt.");
    await sendAdminPing(label);
  } catch (err) {
    console.error("❌ [refreshQrCache] Refresh failed:", err.message);
    try {
      await sendAdminPing(`❌ QR refresh failed: *${err.message}*`);
    } catch (e) {
      console.warn("⚠️ [Admin ping error]:", e.message);
    }
  }
}
