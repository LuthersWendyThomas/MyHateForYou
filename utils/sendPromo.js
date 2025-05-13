// 📦 utils/sendPromo.js | FINAL IMMORTAL v999999999.∞+GODMODE SYNC
// PROMO WRAPPER • BULLETPROOF • MARKDOWN SAFE • AUTO-CLEANUP

import { sendAndTrack } from "../helpers/messageUtils.js";
import { userMessages } from "../state/userState.js";

/**
 * 🎁 Sends a promotional message to user (Markdown-safe, cleanup-tracked)
 *
 * @param {TelegramBot} bot — Telegram bot instance
 * @param {string|number} id — user ID
 * @param {string} code — optional promo code (e.g. "XMAS20")
 * @param {object} userMsgs — optional userMessages object
 * @returns {Promise<object|null>} — sent message object or null
 */
export async function sendPromo(bot, id, code = "", userMsgs = userMessages) {
  const uid = String(id || "").trim();
  if (!bot || !uid) return null;

  try {
    const hasCode = code?.trim()?.length > 0;
    const promoCode = hasCode ? code.toUpperCase().replace(/[^A-Z0-9]/g, "") : null;

    const codeLine = promoCode
      ? `🎟️ Use promo code *${promoCode}* to get your discount!`
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
      return await bot.sendMessage(uid, "⚠️ Failed to deliver promo message.");
    } catch {
      return null;
    }
  }
}
