// 📦 jobs/refreshQrCache.js | IMMORTAL FINAL v2.0•AMOUNTLOCK•SYNCED•BULLETPROOF
// HOURLY QR FALLBACK REFRESH • FULLY SYNCED WITH generateQR.js + qrCacheManager.js

import { refreshQrCache, initQrCacheDir } from "../utils/qrCacheManager.js";
import { sendAdminPing } from "../core/handlers/paymentHandler.js";

export function startQrCacheRefresher() {
  console.log("🕒 [refreshQrCache] QR refresher initialized — running every 60 minutes");

  tryRefresh(true); // 🔄 Initial refresh on bot start

  setInterval(() => tryRefresh(false), 60 * 60 * 1000); // ♻️ Hourly
}

async function tryRefresh(isStartup = false) {
  const label = isStartup
    ? "🔄 QR fallback cache regenerated on startup."
    : "🔁 QR fallback cache regenerated (hourly).";
  const now = new Date().toLocaleTimeString("en-GB");

  try {
    console.log(`♻️ [refreshQrCache] Refreshing fallback cache at ${now} (${isStartup ? "boot" : "hourly"})`);
    await initQrCacheDir();
    await refreshQrCache();
    console.log("✅ [refreshQrCache] Fallback QR cache fully rebuilt.");
    await sendAdminPing(label);
  } catch (err) {
    console.error("❌ [refreshQrCache] Refresh failed:", err.message);
  }
}
