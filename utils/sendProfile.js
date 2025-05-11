// 📦 utils/sendProfile.js | IMMORTAL FINAL v999999999.∞ — BULLETPROOF SYNCED PROFILE LOCK

import { userSessions, userOrders } from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * ✅ Displays user profile summary (safe, synced, bulletproof)
 */
export async function sendProfile(bot, id, userMessages = {}) {
  try {
    const uid = String(id || "").trim();
    if (!bot || !uid) return;

    const session = typeof userSessions[uid] === "object" ? userSessions[uid] : {};
    const orderCount = Number.isInteger(userOrders[uid]) ? userOrders[uid] : 0;

    const chat = await bot.getChat(id).catch(() => null);
    const username = chat?.username ? `@${chat.username}` : "— none —";
    const city = session?.city || "—";

    let status = "🚀 *New user*";
    if (orderCount >= 10) status = "👑 *VIP client*";
    else if (orderCount >= 5) status = "🪄 *Almost VIP!*";

    const profile = `
👤 *Your Profile*

🔗 Telegram: *${username}*
📍 City: *${city}*
📦 Completed Orders: *${orderCount}*
🏅 Status: ${status}

🧾 Session data is temporary and auto-cleared.
🛡️ Fully anonymous. Nothing is stored permanently.
    `.trim();

    return await sendAndTrack(bot, uid, profile, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendProfile error]:", err.message || err);
    try {
      await bot.sendMessage(id, "⚠️ Failed to load your profile.");
    } catch {}
  }
}
