// 📦 utils/sendOrders.js | BalticPharma V2 — IMMORTAL v2025.6 DEPLOY POLISH EDITION

import { sendAndTrack } from "../helpers/messageUtils.js";
import { userOrders } from "../state/userState.js";

/**
 * ✅ Shows user their order statistics
 */
export async function sendOrders(bot, id, userId, userMessages = {}) {
  try {
    const uid = String(userId);
    const raw = userOrders[uid];
    const count = Number.isInteger(raw) && raw > 0 ? raw : 0;

    let text;

    if (count === 0) {
      text = `
📋 *You have no orders yet.*

🛍️ To place your first order – tap the *BUY* button below.

❓ Questions? Tap *HELP*.
      `.trim();
    } else {
      const toVip = getMilestone(count);
      const vipLine = toVip === 0
        ? "⭐️ You are already a *VIP client*! Thank you for your loyalty."
        : `🔁 Place *${toVip}* more orders to reach *VIP status*!`;

      text = `
📦 *Your order statistics:*

✅ Total completed: *${count}*
${vipLine}

Thank you for choosing *BalticPharma™*
      `.trim();
    }

    return await sendAndTrack(bot, id, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendOrders error]:", err.message || err);
    try {
      await bot.sendMessage(id, "❗️ Failed to fetch order history. Please try again later.");
    } catch {}
  }
}

/**
 * 🔁 Calculates how many orders left until VIP status (milestone system)
 */
function getMilestone(count) {
  if (count >= 10) return 0;
  return count >= 5 ? 10 - count : 5 - count;
}
