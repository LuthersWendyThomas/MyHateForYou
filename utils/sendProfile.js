// 📦 utils/sendProfile.js | BalticPharma V2 — IMMORTAL v2025.7 PROFILE FINALIZED EDITION

import { userSessions, userOrders } from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * ✅ Displays user profile summary (bulletproof)
 */
export async function sendProfile(bot, id, userMessages = {}) {
  try {
    const uid = String(id);
    const session = typeof userSessions[uid] === "object" ? userSessions[uid] : {};
    const orderCount = typeof userOrders[uid] === "number" ? userOrders[uid] : 0;

    const chat = await bot.getChat(id);
    const username = chat?.username ? `@${chat.username}` : "NONE";

    const status =
      orderCount >= 10 ? "⭐️ *VIP client*" :
      orderCount >= 5  ? "🔁 *Approaching VIP!*" :
                        "🚀 *New user*";

    const profile = `
👤 *Your Profile:*

🔗 T. Username: *${username}*
🏷️ Status: ${status}
📦 Orders completed: *${orderCount}*
    `.trim();

    return await sendAndTrack(bot, uid, profile, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendProfile error]:", err.message || err);
    try {
      await bot.sendMessage(id, "⚠️ Failed to retrieve profile information.");
    } catch {}
  }
}
