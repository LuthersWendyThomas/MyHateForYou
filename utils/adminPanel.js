// 📦 utils/adminPanel.js | BalticPharma V2 — FINAL ADMIN LOCK v1.9

import { sendAndTrack } from "../helpers/messageUtils.js";
import {
  banUser, unbanUser, banUserTemporary,
  listBannedUsers, listTemporaryBans, clearBans
} from "./bans.js";
import { getStats } from "./saveOrder.js";
import { userSessions } from "../state/userState.js";
import { BOT } from "../config/config.js";

/**
 * Opens the main admin panel menu with all control buttons
 */
export async function openAdminPanel(bot, id) {
  try {
    const keyboard = [
      [{ text: "📊 STATISTICS" }],
      [{ text: "📅 Today" }, { text: "🗓️ Week" }, { text: "📆 Month" }],
      [{ text: "🔒 BAN user" }, { text: "⏳ Temp. BAN" }],
      [{ text: "✅ UNBAN user" }, { text: "🧹 Clear BANs" }],
      [{ text: "📋 Banned list" }, { text: "⏱️ Temp bans" }],
      [{ text: "🔙 Back" }]
    ];

    await sendAndTrack(
      bot,
      id,
      "🛠️ *Admin panel activated*\nChoose an action using the buttons below:",
      {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard,
          resize_keyboard: true,
          one_time_keyboard: false
        }
      },
      {}
    );
  } catch (err) {
    console.error("❌ [openAdminPanel error]:", err.message);
  }
}

/**
 * Handles all admin buttons and step-based actions
 */
export async function handleAdminAction(bot, msg, userSessions, userOrders) {
  try {
    const id = msg?.chat?.id;
    const text = msg?.text?.trim();

    if (!id || String(id) !== String(BOT.ADMIN_ID) || !text) return;

    const session = userSessions[id] ||= {};

    // Step-based: BAN user
    if (session.adminStep === "ban_user") {
      banUser(text);
      delete session.adminStep;
      return await sendAndTrack(bot, id, `🚫 User banned: \`${text}\``, { parse_mode: "Markdown" }, {});
    }

    // Step-based: Temp. BAN
    if (session.adminStep === "temp_ban") {
      const [targetId, minutesRaw] = text.split(" ");
      const minutes = parseInt(minutesRaw);
      if (!targetId || isNaN(minutes) || minutes < 1) {
        return await sendAndTrack(bot, id, "⚠️ Invalid format. Use: `123456789 10`", { parse_mode: "Markdown" }, {});
      }
      banUserTemporary(targetId, minutes);
      delete session.adminStep;
      return await sendAndTrack(bot, id, `⏳ Temporary ban: \`${targetId}\` (${minutes} min)`, { parse_mode: "Markdown" }, {});
    }

    // Step-based: UNBAN
    if (session.adminStep === "unban_user") {
      unbanUser(text);
      delete session.adminStep;
      return await sendAndTrack(bot, id, `✅ User unbanned: \`${text}\``, { parse_mode: "Markdown" }, {});
    }

    // Main buttons
    switch (text) {
      case "📊 STATISTICS":
      case "📅 Today":
      case "🗓️ Week":
      case "📆 Month": {
        const stats = await getStats("admin");
        let msg = "📊 *Statistics:*\n\n";
        if (text === "📊 STATISTICS" || text === "📅 Today") msg += `📅 Today: *${stats.today.toFixed(2)}$*\n`;
        if (text === "📊 STATISTICS" || text === "🗓️ Week") msg += `🗓️ Week: *${stats.week.toFixed(2)}$*\n`;
        if (text === "📊 STATISTICS" || text === "📆 Month") msg += `📆 Month: *${stats.month.toFixed(2)}$*\n`;
        msg += `💰 Total: *${stats.total.toFixed(2)}$*`;

        return await sendAndTrack(bot, id, msg, { parse_mode: "Markdown" }, {});
      }

      case "🔒 BAN user":
        session.adminStep = "ban_user";
        return await sendAndTrack(bot, id, "🔒 Enter the user ID to *ban*:", { parse_mode: "Markdown" }, {});

      case "⏳ Temp. BAN":
        session.adminStep = "temp_ban";
        return await sendAndTrack(bot, id, "⏳ Enter user ID and duration in minutes (e.g. `123456789 10`):", { parse_mode: "Markdown" }, {});

      case "✅ UNBAN user":
        session.adminStep = "unban_user";
        return await sendAndTrack(bot, id, "✅ Enter the user ID to *unban*:", { parse_mode: "Markdown" }, {});

      case "🧹 Clear BANs":
        clearBans();
        return await sendAndTrack(bot, id, "🧹 *All permanent bans cleared.*", { parse_mode: "Markdown" }, {});

      case "📋 Banned list": {
        const list = listBannedUsers();
        const formatted = list.length
          ? list.map(id => `- \`${id}\``).join("\n")
          : "_(Empty)_";
        return await sendAndTrack(bot, id, `📋 *Banned users:*\n${formatted}`, { parse_mode: "Markdown" }, {});
      }

      case "⏱️ Temp bans": {
        const list = listTemporaryBans();
        const formatted = list.length
          ? list.map(b => `- \`${b.userId}\` until ${b.until}`).join("\n")
          : "_(Empty)_";
        return await sendAndTrack(bot, id, `⏱️ *Temporarily banned:*\n${formatted}`, { parse_mode: "Markdown" }, {});
      }

      case "🔙 Back":
        delete session.adminStep;
        return await sendAndTrack(bot, id, "🔙 Returned to main menu.", { parse_mode: "Markdown" }, {});
    }
  } catch (err) {
    console.error("❌ [handleAdminAction error]:", err.message || err);
    if (msg?.chat?.id) {
      await sendAndTrack(bot, msg.chat.id, "❗️ Action processing error. Please try again.", {}, {});
    }
  }
}
