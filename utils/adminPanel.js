// 📦 utils/adminPanel.js | FINAL IMMORTAL ADMINLOCK v999999999.∞ — BULLETPROOF SYNC + LIVE USER COUNT + DISCOUNT CONTROL + FULL IMPORT

import { sendAndTrack } from "../helpers/messageUtils.js";
import {
  banUser,
  unbanUser,
  banUserTemporary,
  listBannedUsers,
  listTemporaryBans,
  clearBans
} from "./bans.js";
import { getStats } from "./saveOrder.js";
import { userSessions, activeUsers } from "../state/userState.js";
import { BOT } from "../config/config.js";
import {
  getDiscountInfo,
  setDiscount,
  removeDiscount,
  DISCOUNT_TYPES
} from "../config/discounts.js";
import { allCategories, allProductNames, getCategoryMap } from "../config/products.js";
import { allRegions, allCities } from "../config/regions.js";

// ✅ FULL SYNCED IMPORT FOR ADMIN USAGE (discounts.js, products.js, regions.js)
const ALL_DISCOUNT_KEYS = {
  user: () => Object.keys(userSessions),
  code: () => [], // Codes are set manually
  region: () => allRegions,
  city: () => allCities,
  category: () => allCategories,
  product: () => allProductNames
};

export async function openAdminPanel(bot, id) {
  try {
    const keyboard = [
      [{ text: "📊 STATISTICS" }],
      [{ text: "📅 Today" }, { text: "🗓️ Week" }, { text: "📆 Month" }],
      [{ text: "🔒 BAN user" }, { text: "⏳ Temp. BAN" }],
      [{ text: "✅ UNBAN user" }, { text: "🧹 Clear BANs" }],
      [{ text: "📋 Banned list" }, { text: "⏱️ Temp bans" }],
      [{ text: "🏷️ Manage Discounts" }],
      [{ text: "🔙 Back" }]
    ];

    const activeCount = activeUsers.count || Object.keys(userSessions).length || 0;

    return await sendAndTrack(
      bot,
      id,
      `🛠️ *Admin panel activated*\n👥 Active users: *${activeCount}*\n\nChoose an action:`,
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
    console.error("❌ [openAdminPanel error]:", err.message || err);
  }
}

export async function handleAdminAction(bot, msg, sessions = userSessions) {
  const id = msg?.chat?.id;
  const text = msg?.text?.trim();
  if (!id || String(id) !== String(BOT.ADMIN_ID) || !text) return;

  const s = (sessions[id] ||= {});

  try {
    if (s.adminStep === "ban_user") {
      banUser(text);
      delete s.adminStep;
      return await sendAndTrack(bot, id, `🚫 User banned: \`${text}\``, { parse_mode: "Markdown" }, {});
    }

    if (s.adminStep === "temp_ban") {
      const [targetId, minsRaw] = text.split(" ");
      const mins = parseInt(minsRaw);
      if (!targetId || isNaN(mins) || mins < 1) {
        return await sendAndTrack(bot, id, "⚠️ Format: `123456789 10`", { parse_mode: "Markdown" }, {});
      }
      banUserTemporary(targetId, mins);
      delete s.adminStep;
      return await sendAndTrack(bot, id, `⏳ Temp ban → \`${targetId}\` for *${mins} min*`, { parse_mode: "Markdown" }, {});
    }

    if (s.adminStep === "unban_user") {
      unbanUser(text);
      delete s.adminStep;
      return await sendAndTrack(bot, id, `✅ User unbanned: \`${text}\``, { parse_mode: "Markdown" }, {});
    }

    if (s.adminStep === "discount_manage") {
      const [type, keyRaw, activeRaw, percentRaw] = text.split(" ");
      const active = activeRaw === "1";
      const pct = parseInt(percentRaw);
      if (!DISCOUNT_TYPES.includes(type)) {
        return await sendAndTrack(bot, id, `❌ Invalid type. Use one of: *${DISCOUNT_TYPES.join(", ")}*`, { parse_mode: "Markdown" }, {});
      }
      setDiscount(type, keyRaw || null, active, pct);
      delete s.adminStep;
      return await sendAndTrack(bot, id, `✅ *${type}* discount updated → \`${keyRaw || "(global)"}\` = *${pct}%* (${active ? "ON" : "OFF"})`, { parse_mode: "Markdown" }, {});
    }

    switch (text) {
      case "📊 STATISTICS":
      case "📅 Today":
      case "🗓️ Week":
      case "📆 Month": {
        const stats = await getStats("admin");
        let out = "📊 *Statistics:*\n\n";
        if (text === "📊 STATISTICS" || text === "📅 Today") out += `📅 Today: *${stats.today.toFixed(2)}$*\n`;
        if (text === "📊 STATISTICS" || text === "🗓️ Week") out += `🗓️ Week: *${stats.week.toFixed(2)}$*\n`;
        if (text === "📊 STATISTICS" || text === "📆 Month") out += `📆 Month: *${stats.month.toFixed(2)}$*\n`;
        out += `💰 Total: *${stats.total.toFixed(2)}$*`;
        return await sendAndTrack(bot, id, out, { parse_mode: "Markdown" }, {});
      }

      case "🔒 BAN user":
        s.adminStep = "ban_user";
        return await sendAndTrack(bot, id, "🔒 Enter user ID to *ban*:", { parse_mode: "Markdown" }, {});

      case "⏳ Temp. BAN":
        s.adminStep = "temp_ban";
        return await sendAndTrack(bot, id, "⏳ Enter ID + minutes (e.g. `123456789 10`):", { parse_mode: "Markdown" }, {});

      case "✅ UNBAN user":
        s.adminStep = "unban_user";
        return await sendAndTrack(bot, id, "✅ Enter user ID to *unban*:", { parse_mode: "Markdown" }, {});

      case "🧹 Clear BANs":
        clearBans();
        return await sendAndTrack(bot, id, "🧹 *All bans cleared*", { parse_mode: "Markdown" }, {});

      case "📋 Banned list": {
        const list = listBannedUsers();
        const out = list.length ? list.map(id => `- \`${id}\``).join("\n") : "_(No permanent bans)_";
        return await sendAndTrack(bot, id, `📋 *Banned users:*\n${out}`, { parse_mode: "Markdown" }, {});
      }

      case "⏱️ Temp bans": {
        const temp = listTemporaryBans();
        const out = temp.length ? temp.map(b => `- \`${b.userId}\` until ${b.until}`).join("\n") : "_(No temp bans)_";
        return await sendAndTrack(bot, id, `⏱️ *Temporary bans:*\n${out}`, { parse_mode: "Markdown" }, {});
      }

      case "🏷️ Manage Discounts": {
        const all = getDiscountInfo();
        const info = [
          all.global,
          ...all.users,
          ...all.codes,
          ...all.regions,
          ...all.cities,
          ...all.categories,
          ...all.products
        ].join("\n");

        s.adminStep = "discount_manage";
        return await sendAndTrack(bot, id,
          `🏷️ *Discounts:*\n\n${info}\n\n✍️ *Input format:* \n\`type key active percent\`\n\n*Example:* \`user 123456789 1 20\`\nAvailable types: *${DISCOUNT_TYPES.join(" | ")}*`,
          { parse_mode: "Markdown" }, {});
      }

      case "🔙 Back":
        delete s.adminStep;
        return await sendAndTrack(bot, id, "🔙 Back to menu.", { parse_mode: "Markdown" }, {});
    }
  } catch (err) {
    console.error("❌ [handleAdminAction error]:", err.message || err);
    try {
      await sendAndTrack(bot, id, "❗️ Admin error. Try again.", {}, {});
    } catch {}
  }
}
