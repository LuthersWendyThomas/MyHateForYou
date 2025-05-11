// 📦 utils/sendStart.js | FINAL IMMORTAL v999999999 — MAIN ENTRYPOINT WRAPPER (SAFE MIRROR SYNCED)

import { safeStart } from "../core/handlers/finalHandler.js";

/**
 * ✅ Entrypoint wrapper — launches main menu safely via internal safeStart
 * 🔒 Fully synced with system reset, delivery handling, cleanup and sessions
 *
 * Used in:
 *  • /start handler
 *  • fallback recovery flow
 *  • button-based relaunch from stepHandler / finalHandler
 */
export async function sendStart(bot, id, userMessages = {}) {
  try {
    const uid = String(id || "").trim();
    if (!bot || !uid) return;

    return await safeStart(bot, uid);
  } catch (err) {
    console.error("❌ [sendStart error]:", err.message || err);
    try {
      return await bot.sendMessage(id, "⚠️ Failed to load start screen. Please type /start.");
    } catch (fallbackErr) {
      console.warn("⚠️ [sendStart fallback failed]:", fallbackErr.message);
    }
  }
}
