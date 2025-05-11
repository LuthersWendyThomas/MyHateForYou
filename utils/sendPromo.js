// 📦 utils/sendPromo.js | FINAL IMMORTAL v1.0 — DYNAMIC PROMO SHOWCASE + SYNC

import { getDiscountInfo } from "../config/discounts.js";
import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * 🎁 Shows current active discounts (if any)
 */
export async function sendPromo(bot, id, userMessages = {}) {
  try {
    const uid = String(id || "").trim();
    if (!bot || !uid) return;

    const all = getDiscountInfo();

    const allLines = [
      all.global,
      ...all.codes,
      ...all.categories,
      ...all.products
    ].filter(Boolean);

    if (!allLines.length) {
      return await sendAndTrack(bot, uid, "ℹ️ *No active promos or discounts at the moment.*", {
        parse_mode: "Markdown"
      }, userMessages);
    }

    const out = `
🎁 *Current Promos & Discounts:*

${allLines.join("\n")}

🔥 Tap BUY to use these offers now.
    `.trim();

    return await sendAndTrack(bot, uid, out, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendPromo error]:", err.message || err);
    try {
      await bot.sendMessage(id, "⚠️ Failed to load promo info.");
    } catch {}
  }
}
