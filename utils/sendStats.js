// 📦 utils/sendStats.js | BalticPharma V2 — IMMORTAL v2025.6 FINAL TELEMETRY CORE LOCK

import { userOrders, userSessions, activeUsers } from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { BOT } from "../config/config.js";

/**
 * ✅ Displays statistics (admin or user)
 */
export async function sendStats(bot, id, userMessages = {}) {
  try {
    const uid = String(id);
    const isAdmin = BOT.ADMIN_ID && uid === String(BOT.ADMIN_ID);

    if (isAdmin) {
      const totalUsers = Object.keys(userSessions || {}).length;
      const totalOrders = Object.values(userOrders || {}).reduce(
        (sum, val) => sum + (Number(val) || 0), 0
      );
      const activeCount = Number(activeUsers?.count) || totalUsers;

      const now = new Date().toLocaleString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      });

      const adminStats = `
📊 *ADMIN Statistics:*

👤 *Active users:* ${activeCount}
📦 *Total orders:* ${totalOrders}
🧠 *Active sessions:* ${totalUsers}

⏱ *Updated at:* ${now}
      `.trim();

      return await sendAndTrack(bot, id, adminStats, {
        parse_mode: "Markdown",
        disable_web_page_preview: true
      }, userMessages);
    }

    const userOrderCount = Number(userOrders[uid]) || 0;

    const userStats = `
📦 *Your Statistics:*

✅ Orders completed: *${userOrderCount}*
⏱ Tracking active since your first order.

🔒 All data is stored locally — *no personal data is saved*.
    `.trim();

    return await sendAndTrack(bot, id, userStats, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendStats error]:", err.message || err);
    return await sendAndTrack(bot, id, "⚠️ Failed to fetch statistics.", {}, userMessages);
  }
}
