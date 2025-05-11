// 📦 utils/sendOrders.js | IMMORTAL FINAL v999999999.∞ — BULLETPROOF VIP STATUS SYNCED + UX LOCKED

import { sendAndTrack } from "../helpers/messageUtils.js";
import { userOrders } from "../state/userState.js";

/**
 * ✅ Parodo naudotojo užsakymų statistiką ir VIP progresą
 */
export async function sendOrders(bot, id, userId, userMessages = {}) {
  try {
    const uid = String(userId || "").trim();
    if (!bot || !uid) return;

    const raw = userOrders[uid];
    const count = Number.isInteger(raw) && raw > 0 ? raw : 0;

    let text;

    if (count === 0) {
      text = `
📋 *You have no orders yet.*

🛍️ To place your first order — tap the *BUY* button below.

❓ Questions? Tap *HELP*.
      `.trim();
    } else {
      const toVip = getMilestone(count);
      const vipLine = toVip === 0
        ? "👑 *VIP Status unlocked!*\n💎 Thank you for being a loyal client."
        : `🔁 *${toVip} more orders* until you reach *VIP client status!*`;

      text = `
📦 *Your order statistics:*

✅ Total completed: *${count}*
${vipLine}

🫶 Thank you for choosing *BalticPharma™*
      `.trim();
    }

    return await sendAndTrack(bot, id, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendOrders error]:", err.message || err);
    try {
      await bot.sendMessage(id, "❗️ Failed to load your order stats. Please try again.");
    } catch {}
  }
}

/**
 * 🔁 Skaičiuoja, kiek užsakymų trūksta iki VIP statuso
 */
function getMilestone(count) {
  if (count >= 10) return 0;
  return count >= 5 ? 10 - count : 5 - count;
}
