// 📦 utils/sendPromo.js | FINAL IMMORTAL v999999999 — PROMO WRAPPER + BULLETPROOF TRACK

import { sendAndTrack } from "../helpers/messageUtils.js";
import { userMessages } from "../state/userState.js";

/**
 * 🎁 Sends a promotional message to user (uses Markdown + cleanup-safe)
 * @param {object} bot — Telegram bot instance
 * @param {string|number} id — user ID
 * @param {string} code — optional promo code (uppercase, e.g. "XMAS20")
 */
export async function sendPromo(bot, id, code = "", userMsgs = userMessages) {
  try {
    const uid = String(id || "").trim();
    if (!bot || !uid) return;

    const codeLine = code?.trim()
      ? `🎟️ Use promo code *${code.toUpperCase()}* to get your discount!`
      : `🎁 Check the main menu for active discounts.`;

    const text = `
🤑 *Special Promo Just for You!*

💥 Enjoy discounts on selected products  
🚀 Fast delivery & 100% anonymity guaranteed  

${codeLine}

👇 Start ordering now from the main menu:
    `.trim();

    return await sendAndTrack(bot, uid, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMsgs);
  } catch (err) {
    console.error("❌ [sendPromo error]:", err.message || err);
    try {
      return await bot.sendMessage(id, "⚠️ Failed to deliver promo message.");
    } catch {}
  }
}
