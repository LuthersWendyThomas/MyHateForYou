// 📦 jobs/refreshQrCache.js | IMMORTAL FINAL v1.0.0•HOURLY•SYNCED
// CRYPTO RATE SYNC • QR CACHE REFRESHER • 60min INTERVAL ENGINE

import { generateFullQrCache } from "../utils/qrCacheManager.js";

// ✅ Launch QR cache rebuild
export async function startQrCacheRefresher() {
  console.log("🕒 [refreshQrCache] QR cache refresher started — runs every 1h");

  // Run immediately on startup
  await tryRefresh();

  // Then refresh every 60 minutes
  setInterval(tryRefresh, 60 * 60 * 1000);
}

// ——— Safe refresh handler ———
async function tryRefresh() {
  const ts = new Date().toLocaleTimeString("en-GB");
  try {
    console.log(`♻️ [refreshQrCache] Refreshing QR cache — ${ts}`);
    await generateFullQrCache();
    console.log("✅ [refreshQrCache] QR cache fully refreshed.");
  } catch (err) {
    console.error("❌ [refreshQrCache] Failed:", err.message);
  }
}
