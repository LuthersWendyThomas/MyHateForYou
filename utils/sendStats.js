import { userOrders, userSessions, activeUsers } from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { BOT } from "../config/config.js";

/**
 * ✅ Sends statistics — admin gets system view, users see personal usage
 */
export async function sendStats(bot, id, userMessages = {}) {
  try {
    const uid = String(id).trim();
    if (!bot || !uid) return;

    const isAdmin = BOT.ADMIN_ID && uid === String(BOT.ADMIN_ID);

    if (isAdmin) {
      const sessionCount = Object.keys(userSessions || {}).length;
      const totalOrders = Object.values(userOrders || {}).reduce(
        (sum, val) => sum + (Number(val) || 0), 0
      );
      const activeCount = Number(activeUsers?.count) || 0;

      const timestamp = new Date().toLocaleString("en-GB", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit"
      });

      const msg = `
📊 *SYSTEM TELEMETRY — ADMIN VIEW*

👤 *Live active users:* ${activeCount}
📦 *Total completed orders:* ${totalOrders}
🧠 *Tracked sessions:* ${sessionCount}

🕓 Updated: _${timestamp}_
`.trim();

      return await sendAndTrack(bot, id, msg, {
        parse_mode: "Markdown",
        disable_web_page_preview: true
      }, userMessages);
    }

    // — Standard user
    const count = Number(userOrders?.[uid]) || 0;
    const userMsg = `
📦 *Your usage stats:*

✅ Orders completed: *${count}*
🔒 Fully anonymous — *no private data saved*

Use *PROFILE* for full account view.
`.trim();

    return await sendAndTrack(bot, id, userMsg, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendStats error]:", err.message || err);
    return await sendAndTrack(bot, id, "⚠️ Failed to fetch stats. Try again later.", {}, userMessages);
  }
}
