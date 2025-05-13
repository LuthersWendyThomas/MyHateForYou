// 📦 utils/sendStart.js | FINAL IMMORTAL v999999999.∞+GODLOCK SYNC
// MAIN ENTRYPOINT WRAPPER • BULLETPROOF • FALLBACK SAFE • SESSION SYNCED

import { safeStart } from "../core/handlers/finalHandler.js";

/**
 * ✅ Entrypoint wrapper — launches main menu safely via internal safeStart
 * 🔒 Fully synced with system reset, delivery handling, cleanup and sessions
 *
 * Used in:
 *  • /start handler
 *  • fallback recovery flow
 *  • button-based relaunch from stepHandler / finalHandler
 *
 * @param {TelegramBot} bot — Telegram bot instance
 * @param {string|number} id — user ID
 * @param {object} userMessages — optional msg tracker
 * @returns {Promise<object|null>} — message or null
 */
export async function sendStart(bot, id, userMessages = {}) {
  const uid = String(id || "").trim();
  if (!bot || !uid) return null;

  try {
    return await safeStart(bot, uid);
  } catch (err) {
    console.error("❌ [sendStart error]:", err.message || err);
    try {
      return await bot.sendMessage(uid, "⚠️ Failed to load start screen. Please type /start.");
    } catch (fallbackErr) {
      console.warn("⚠️ [sendStart fallback failed]:", fallbackErr.message);
      return null;
    }
  }
}
