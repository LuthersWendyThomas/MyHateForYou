// 📦 utils/sendStats.js | FINAL IMMORTAL v999999999999 — GODMODE ADMIN+USER METRICS LOCK

import { userOrders, userSessions, activeUsers } from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { BOT } from "../config/config.js";

/**
 * 📊 Sends dynamic statistics (admin = full telemetry, user = own stats)
 */
export async function sendStats(bot, id, userMessages = {}) {
  try {
    const uid = String(id || "").trim();
    if (!bot || !uid) return;

    const isAdmin = uid === String(BOT.ADMIN_ID);

    if (isAdmin) {
      const sessions = Object.keys(userSessions || {}).length;
      const totalOrders = Object.values(userOrders || {}).reduce((acc, val) => acc + (Number(val) || 0), 0);
      const active = activeUsers?.count || 0;
      const ts = new Date().toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });

      const out = `
📊 *SYSTEM TELEMETRY (ADMIN VIEW)*

👥 *Active sessions:* ${active}
📦 *Total orders completed:* ${totalOrders}
🧠 *Tracked sessions:* ${sessions}

🕓 Updated: _${ts}_
`.trim();

      return await sendAndTrack(bot, uid, out, {
        parse_mode: "Markdown",
        disable_web_page_preview: true
      }, userMessages);
    }

    // — USER stats view
    const count = Number(userOrders?.[uid]) || 0;

    const out = `
📦 *Your usage stats:*

✅ Orders completed: *${count}*
🔒 Fully anonymous — *no data stored*

Use *👤 Profile* to view account info.
`.trim();

    return await sendAndTrack(bot, uid, out, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendStats error]:", err.message || err);
    return await sendAndTrack(bot, id, "⚠️ Failed to fetch stats. Try again later.", {}, userMessages);
  }
}
