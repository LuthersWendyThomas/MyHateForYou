// 📦 jobs/refreshQrCache.js | IMMORTAL FINAL v1.1.0•999999x•GODMODE•SYNCFIX
// HOURLY CRYPTO RATE SYNC + QR CACHE REFRESH + ADMIN PING • 24/7 DIAMONDLOCK ENGINE

import { generateFullQrCache } from "../utils/qrCacheManager.js";
import { sendAdminPing } from "../core/handlers/paymentHandler.js";

/**
 * 🔁 Start QR cache refresher:
 * Runs immediately on boot, then every hour.
 */
export function startQrCacheRefresher() {
  console.log("🕒 [refreshQrCache] QR refresher started — running every 60 minutes");

  // 🔧 Immediate refresh on startup
  tryRefresh(true);

  // 🔁 Hourly refresh
  setInterval(() => tryRefresh(false), 60 * 60 * 1000);
}

/**
 * ♻️ Safe refresh wrapper (with admin ping + logging)
 */
async function tryRefresh(isStartup = false) {
  const label = isStartup ? "🔄 QR cache atnaujintas paleidimo metu." : "🔁 QR cache atnaujintas (valandinis).";
  const ts = new Date().toLocaleTimeString("en-GB");

  try {
    console.log(`♻️ [refreshQrCache] Refreshing QR cache — ${ts}`);
    await generateFullQrCache();
    console.log("✅ [refreshQrCache] QR cache fully refreshed.");
    await sendAdminPing(label);
  } catch (err) {
    console.error("❌ [refreshQrCache] Failed:", err.message);
  }
}
