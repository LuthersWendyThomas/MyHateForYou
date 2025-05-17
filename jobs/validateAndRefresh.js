// 📦 jobs/validateAndRefresh.js | IMMORTAL FINAL v1.0.0 • GODMODE • BULLETPROOF

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";

import {
  generateFullQrCache,
  validateQrFallbacks,
  initQrCacheDir
} from "../utils/qrCacheManager.js";

import {
  FALLBACK_DIR,
  sanitizeAmount
} from "../utils/fallbackPathUtils.js";

import { getAllQrScenarios } from "../utils/qrScenarios.js";
import { sendAdminPing } from "../core/handlers/paymentHandler.js";

const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h expiry
const INTERVAL_HOURS = 6;
let isRunning = false;

/**
 * 🟢 Start the recurring QR fallback refresh engine
 */
export function startQrValidationAndRefresh() {
  console.log(`🛠️ [validateAndRefresh] Scheduled every ${INTERVAL_HOURS}h`);
  setTimeout(() => scheduleRefresh(true), 3 * 60 * 1000); // ⏱️ Delay 3min on startup
  setInterval(() => scheduleRefresh(false), INTERVAL_HOURS * 60 * 60 * 1000);
}

/**
 * 🔁 Schedule fallback QR regeneration + validation
 */
function scheduleRefresh(isStartup = false) {
  if (isRunning) {
    console.log("⏳ [validateAndRefresh] Skipping — already running.");
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
 * 🚀 Full fallback refresh + validation pipeline
 */
async function runRefreshCycle(isStartup) {
  const label = isStartup
    ? "🔄 Fallback QR refresh (on startup)"
    : "♻️ Fallback QR refresh (interval)";
  const now = new Date().toLocaleTimeString("en-GB");

  try {
    console.log(`🧹 [validateAndRefresh] Cleaning expired PNGs...`);
    await initQrCacheDir();
    // ⏩ Expired QR cleanup removed — now using full overwrite
    const expiredCount = 0;

    const expected = await getExpectedQrCount();
    console.log(`🚀 [validateAndRefresh] Generating ${expected} fallback QR codes...`);
    await generateFullQrCache(true);

    console.log(`🔍 [validateAndRefresh] Validating fallback QR cache...`);
    await validateQrFallbacks(true);

    console.log(`✅ [validateAndRefresh] QR cache updated and validated.`);
    await sendAdminPing(
  `✅ *QR fallback system refreshed*\n` +
  `⏱ Trigger: ${label}\n` +
  `🗑️ Expired: *0* _(cleanup disabled)_\n📦 Total: *${expected}*\n🕒 ${now}`
);

  } catch (err) {
    console.error(`❌ [validateAndRefresh] Exception: ${err.message}`);
    try {
      await sendAdminPing(`❌ QR refresh failed: *${err.message}*`);
    } catch (pingErr) {
      console.warn("⚠️ Admin ping failed:", pingErr.message);
    }
  }
}

/**
 * 📊 Fetch expected fallback scenario count
 */
async function getExpectedQrCount() {
  const scenarios = await getAllQrScenarios();
  return scenarios.length;
}
