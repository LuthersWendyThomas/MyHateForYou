// 📦 jobs/validateAndRefresh.js | IMMORTAL FINAL v1.2.1 • PLAN-C LOCK • NAMED ONLY • DEBUG-AWARE • BULLETPROOF

import {
  generateFullQrCache,
  validateQrFallbacks,
  initQrCacheDir
} from "../utils/qrCacheManager.js";

import { getAllQrScenarios } from "../utils/qrScenarios.js";
import { sendAdminPing } from "../core/handlers/paymentHandler.js";

const DEBUG = process.env.DEBUG_MESSAGES === "true";

const INTERVAL_HOURS = 6;
let isRunning = false;

/**
 * 🟢 Start the recurring QR fallback refresh engine
 */
export function startQrValidationAndRefresh() {
  if (DEBUG) console.log(`🛠️ [validateAndRefresh] Scheduled every ${INTERVAL_HOURS}h`);
  setTimeout(() => scheduleRefresh(true), 3 * 60 * 1000); // ⏱️ Delay 3min on startup
  setInterval(() => scheduleRefresh(false), INTERVAL_HOURS * 60 * 60 * 1000);
}

/**
 * 🔁 Schedule fallback QR regeneration + validation
 */
function scheduleRefresh(isStartup = false) {
  if (isRunning) {
    if (DEBUG) console.log("⏳ [validateAndRefresh] Skipping — already running.");
    return;
  }

  isRunning = true;

  runRefreshCycle(isStartup)
    .catch(err => {
      console.error(`❌ [validateAndRefresh] Critical error: ${err.message}`);
    })
    .finally(() => {
      isRunning = false;
    });
}

/**
 * 🚀 Full fallback refresh + validation pipeline (PLAN-C)
 */
async function runRefreshCycle(isStartup) {
  const label = isStartup
    ? "🔄 Fallback QR refresh (on startup)"
    : "♻️ Fallback QR refresh (interval)";
  const now = new Date().toLocaleTimeString("en-GB");

  try {
    await initQrCacheDir();

    const expected = await getExpectedQrCount();
    if (DEBUG) console.log(`🚀 [validateAndRefresh] Generating ${expected} fallback QR codes...`);
    await generateFullQrCache(true);

    if (DEBUG) console.log(`🔍 [validateAndRefresh] Validating fallback QR cache...`);
    await validateQrFallbacks(true);

    if (DEBUG) console.log(`✅ [validateAndRefresh] QR cache updated and validated.`);
    await sendAdminPing(
      `✅ *QR fallback system refreshed*\n` +
      `⏱ Trigger: ${label}\n` +
      `📦 Total: *${expected}*\n🕒 ${now}`
    );
  } catch (err) {
    console.error(`❌ [validateAndRefresh] Exception: ${err.message}`);
    try {
      await sendAdminPing(`❌ QR refresh failed: *${err.message}*`);
    } catch (pingErr) {
      if (DEBUG) console.warn("⚠️ Admin ping failed:", pingErr.message);
    }
  }
}

/**
 * 📊 Fetch expected fallback scenario count (based on all products/categories/qty)
 */
async function getExpectedQrCount() {
  const scenarios = await getAllQrScenarios();
  return scenarios.length;
}
