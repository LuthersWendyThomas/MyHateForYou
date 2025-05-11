// 📦 utils/sendStart.js | FINAL IMMORTAL v999999999 — MAIN MENU WRAPPER (SAFE SYNC)

import { safeStart } from "../core/handlers/finalHandler.js";

/**
 * ✅ Wrapper: start session and show main menu (uses safeStart internally)
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
    } catch {}
  }
}
