// 📦 jobs/refreshQrCache.js | IMMORTAL FINAL v5.0.0•QRMASTER•520x-SYNC•HOURLY+AI-FALLBACK
// AUTOMATED FALLBACK REBUILDER • 520x SCENARIOS • SYNCED WITH generateQR.js

import { generateFullQrCache } from "../utils/qrCacheManager.js";
import { sendAdminPing } from "../core/handlers/paymentHandler.js";

/**
 * 🕒 Startup + hourly fallback generator
 */
export function startQrCacheRefresher() {
  console.log("🕒 [refreshQrCache] Fallback refresher initialized — every 4 hours");
  tryRefresh(true); // On startup
  setInterval(() => tryRefresh(false), 4 * 60 * 60 * 1000); // Every 4 hours
}

/**
 * 🔁 Run QR cache refresh
 */
async function tryRefresh(isStartup = false) {
  const now = new Date().toLocaleTimeString("en-GB");
  const label = isStartup
    ? "🔄 QR fallback cache generated on bot startup."
    : "♻️ QR fallback cache auto-refreshed (every 4h).";

  try {
    console.log(`♻️ [refreshQrCache] Started at ${now} (${isStartup ? "startup" : "interval"})`);
    await generateFullQrCache();
    console.log("✅ [refreshQrCache] All fallback PNGs rebuilt.");
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
