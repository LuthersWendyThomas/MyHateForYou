// 📦 utils/adminPanel.js | FINAL IMMORTAL ADMINLOCK v3.0 — BULLETPROOF SYNC 2025

import { sendAndTrack } from "../helpers/messageUtils.js";
import {
  banUser, unbanUser, banUserTemporary,
  listBannedUsers, listTemporaryBans, clearBans
} from "./bans.js";
import { getStats } from "./saveOrder.js";
import { userSessions } from "../state/userState.js";
import { BOT } from "../config/config.js";

/**
 * 🛠️ Opens admin panel with control buttons
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

    return await sendAndTrack(
      bot,
      id,
      "🛠️ *Admin panel activated*\nChoose an action:",
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
 * 🔄 Handles all admin interactions and step-based actions
 */
export async function handleAdminAction(bot, msg, userSessions, userOrders) {
  const id = msg?.chat?.id;
  const text = msg?.text?.trim();
  if (!id || String(id) !== String(BOT.ADMIN_ID) || !text) return;

  const session = userSessions[id] ||= {};

  try {
    switch (session.adminStep) {
      case "ban_user": {
        banUser(text);
        delete session.adminStep;
        return await sendAndTrack(bot, id, `🚫 User banned: \`${text}\``, { parse_mode: "Markdown" }, {});
      }
      case "temp_ban": {
        const [targetId, minutesRaw] = text.split(" ");
        const minutes = parseInt(minutesRaw);
        if (!targetId || isNaN(minutes) || minutes < 1) {
          return await sendAndTrack(
            bot,
            id,
            "⚠️ Invalid format. Use: `123456789 10`",
            { parse_mode: "Markdown" },
            {}
          );
        }
        banUserTemporary(targetId, minutes);
        delete session.adminStep;
        return await sendAndTrack(
          bot,
          id,
          `⏳ Temporary ban applied: \`${targetId}\` (${minutes} min)`,
          { parse_mode: "Markdown" },
          {}
        );
      }
      case "unban_user": {
        unbanUser(text);
        delete session.adminStep;
        return await sendAndTrack(bot, id, `✅ User unbanned: \`${text}\``, { parse_mode: "Markdown" }, {});
      }
    }

    // — Admin button actions
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
        return await sendAndTrack(bot, id, "⏳ Enter user ID and minutes (e.g. `123456789 10`):", { parse_mode: "Markdown" }, {});

      case "✅ UNBAN user":
        session.adminStep = "unban_user";
        return await sendAndTrack(bot, id, "✅ Enter the user ID to *unban*:", { parse_mode: "Markdown" }, {});

      case "🧹 Clear BANs":
        clearBans();
        return await sendAndTrack(bot, id, "🧹 *All permanent bans have been cleared.*", { parse_mode: "Markdown" }, {});

      case "📋 Banned list": {
        const list = listBannedUsers();
        const body = list.length ? list.map(id => `- \`${id}\``).join("\n") : "_(Empty)_";
        return await sendAndTrack(bot, id, `📋 *Banned users:*\n${body}`, { parse_mode: "Markdown" }, {});
      }

      case "⏱️ Temp bans": {
        const list = listTemporaryBans();
        const body = list.length
          ? list.map(b => `- \`${b.userId}\` until ${b.until}`).join("\n")
          : "_(Empty)_";
        return await sendAndTrack(bot, id, `⏱️ *Temporary bans:*\n${body}`, { parse_mode: "Markdown" }, {});
      }

      case "🔙 Back":
        delete session.adminStep;
        return await sendAndTrack(bot, id, "🔙 Returned to admin menu.", { parse_mode: "Markdown" }, {});
    }
  } catch (err) {
    console.error("❌ [handleAdminAction error]:", err.message || err);
    try {
      await sendAndTrack(bot, id, "❗️ Admin action failed. Please try again.", {}, {});
    } catch {}
  }
}
