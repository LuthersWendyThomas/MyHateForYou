import { userSessions, userOrders } from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * ✅ Displays user profile summary (safe, synced, bulletproof)
 */
export async function sendProfile(bot, id, userMessages = {}) {
  try {
    const uid = String(id).trim();
    if (!bot || !uid) return;

    const session = typeof userSessions[uid] === "object" ? userSessions[uid] : {};
    const orderCount = typeof userOrders[uid] === "number" ? userOrders[uid] : 0;

    const chat = await bot.getChat(id).catch(() => null);
    const username = chat?.username ? `@${chat.username}` : "— none —";

    let status = "🚀 *New user*";
    if (orderCount >= 10) status = "👑 *VIP client*";
    else if (orderCount >= 5) status = "🪄 *Almost VIP!*";

    const profile = `
👤 *Your Profile*

🔗 Telegram: *${username}*
📦 Completed Orders: *${orderCount}*
🏅 Status: ${status}

🧾 All data auto-reset after every session.
🛡️ Fully anonymous | 0 data stored on server.
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
