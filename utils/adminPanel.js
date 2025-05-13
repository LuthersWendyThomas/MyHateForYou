// 📦 utils/adminPanel.js | FINAL IMMORTAL ADMINLOCK v999999999.9999∞.1
// MAX SYNC + DISCOUNT CONTROL + TOGGLE SYSTEM + BROADCAST + STATS + BULLETPROOF UPGRADE

import { sendAndTrack } from "../helpers/messageUtils.js";
import {
  banUser, unbanUser, banUserTemporary,
  listBannedUsers, listTemporaryBans, clearBans
} from "./bans.js";

import { getStats } from "./saveOrder.js";
import { userSessions, activeUsers } from "../state/userState.js";
import { BOT } from "../config/config.js";
import {
  DISCOUNTS, getDiscountInfo, setDiscount, DISCOUNT_TYPES
} from "../config/discounts.js";

import {
  allCategories, allProductNames, getCategoryMap, products
} from "../config/products.js";

import { allRegions, allCities, REGION_MAP } from "../config/regions.js";
import { startBroadcast } from "./adminBroadcast.js";

export async function openAdminPanel(bot, id) {
  const keyboard = [
    [{ text: "📊 STATISTICS" }],
    [{ text: "📅 Today" }, { text: "🗓️ Week" }, { text: "📆 Month" }],
    [{ text: "🔒 BAN user" }, { text: "⏳ Temp. BAN" }],
    [{ text: "✅ UNBAN user" }, { text: "🧹 Clear BANs" }],
    [{ text: "📋 Banned list" }, { text: "⏱️ Temp bans" }],
    [{ text: "🏷️ Manage Discounts" }],
    [{ text: "🟢 Toggle Items" }],
    [{ text: "📣 Broadcast" }],
    [{ text: "🔙 Back" }]
  ];

  const count = activeUsers.count || Object.keys(userSessions).length || 0;

  return sendAndTrack(bot, id, `🛠️ *Admin panel activated*\n👥 Active users: *${count}*\n\nChoose an action:`, {
    parse_mode: "Markdown",
    reply_markup: { keyboard, resize_keyboard: true }
  }, {});
}

export async function handleAdminAction(bot, msg, sessions = userSessions) {
  const id = msg?.chat?.id;
  const text = msg?.text?.trim();
  if (!id || String(id) !== String(BOT.ADMIN_ID) || !text) return;

  const s = (sessions[id] ||= {});

  try {
    if (s.adminStep === "ban_user") {
      await banUser(text); delete s.adminStep;
      return sendAndTrack(bot, id, `❌ User banned: \`${text}\``, { parse_mode: "Markdown" }, {});
    }

    if (s.adminStep === "temp_ban") {
      const [targetId, minsRaw] = text.split(" ");
      const mins = parseInt(minsRaw);
      if (!targetId || isNaN(mins) || mins < 1)
        return sendAndTrack(bot, id, "⚠️ Format: `123456789 10`", { parse_mode: "Markdown" }, {});
      await banUserTemporary(targetId, mins); delete s.adminStep;
      return sendAndTrack(bot, id, `⏳ Temp ban → \`${targetId}\` for *${mins} min*`, { parse_mode: "Markdown" }, {});
    }

    if (s.adminStep === "unban_user") {
      await unbanUser(text); delete s.adminStep;
      return sendAndTrack(bot, id, `✅ User unbanned: \`${text}\``, { parse_mode: "Markdown" }, {});
    }

    if (s.adminStep === "discount_manage") {
      const [type, keyRaw, activeRaw, percentRaw] = text.split(" ");
      const active = activeRaw === "1";
      const pct = parseInt(percentRaw);
      if (!DISCOUNT_TYPES.includes(type))
        return sendAndTrack(bot, id, `❌ Invalid type. Use: *${DISCOUNT_TYPES.join(", ")}*`, { parse_mode: "Markdown" }, {});
      setDiscount(type, keyRaw || null, active, pct); delete s.adminStep;
      return sendAndTrack(bot, id,
        `✅ *${type}* discount updated → \`${keyRaw || "(global)"}\` = *${pct}%* (${active ? "ON" : "OFF"})`,
        { parse_mode: "Markdown" }, {});
    }

    if (s.adminStep === "toggle_manage") {
      const [target, statusRaw] = text.split(" ");
      const status = statusRaw === "1";

      if (REGION_MAP[target]) REGION_MAP[target].active = status;
      else if (allCities.includes(target)) {
        for (const r of Object.values(REGION_MAP)) {
          if (r.cities?.[target] !== undefined) r.cities[target] = status;
        }
      } else if (allCategories.includes(target)) {
        for (const p of products[target] || []) p.active = status;
      } else if (allProductNames.includes(target)) {
        const cat = getCategoryMap[target];
        if (cat) {
          const product = products[cat]?.find(p => p.name === target);
          if (product) product.active = status;
        }
      } else {
        return sendAndTrack(bot, id, `❌ Unknown item: \`${target}\``, { parse_mode: "Markdown" }, {});
      }

      delete s.adminStep;
      return sendAndTrack(bot, id, `🟢 Toggle updated: \`${target}\` → ${status ? "ON ✅" : "OFF ❌"}`, { parse_mode: "Markdown" }, {});
    }

    if (s.adminStep === "broadcast") {
      await startBroadcast(bot, id, text);
      delete s.adminStep;
      return;
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
        return sendAndTrack(bot, id, out, { parse_mode: "Markdown" }, {});
      }

      case "🔒 BAN user":
        s.adminStep = "ban_user";
        return sendAndTrack(bot, id, "🔒 Enter user ID to *ban*:", { parse_mode: "Markdown" }, {});

      case "⏳ Temp. BAN":
        s.adminStep = "temp_ban";
        return sendAndTrack(bot, id, "⏳ Enter ID + minutes (e.g. `123456789 10`):", { parse_mode: "Markdown" }, {});

      case "✅ UNBAN user":
        s.adminStep = "unban_user";
        return sendAndTrack(bot, id, "✅ Enter user ID to *unban*:", { parse_mode: "Markdown" }, {});

      case "🧹 Clear BANs":
        clearBans();
        return sendAndTrack(bot, id, "🧹 *All bans cleared*", { parse_mode: "Markdown" }, {});

      case "📋 Banned list": {
        const list = listBannedUsers();
        const out = list.length ? list.map(id => `- \`${id}\``).join("\n") : "_(No permanent bans)_";
        return sendAndTrack(bot, id, `📋 *Banned users:*\n${out}`, { parse_mode: "Markdown" }, {});
      }

      case "⏱️ Temp bans": {
        const temp = listTemporaryBans();
        const out = temp.length ? temp.map(b => `- \`${b.userId}\` until ${b.until}`).join("\n") : "_(No temp bans)_";
        return sendAndTrack(bot, id, `⏱️ *Temporary bans:*\n${out}`, { parse_mode: "Markdown" }, {});
      }

      case "🏷️ Manage Discounts": {
        const all = getDiscountInfo();
        const info = [
          all.global, ...all.users, ...all.codes,
          ...all.regions, ...all.cities,
          ...all.categories, ...all.products
        ].join("\n");
        s.adminStep = "discount_manage";
        return sendAndTrack(bot, id,
          `🏷️ *Discounts:*\n\n${info}\n\n✍️ *Format:* \`type key active percent\`\nExample: \`user 123456789 1 20\`\nTypes: *${DISCOUNT_TYPES.join(" | ")}*`,
          { parse_mode: "Markdown" }, {});
      }

      case "🟢 Toggle Items":
        s.adminStep = "toggle_manage";
        return sendAndTrack(bot, id,
          `🟢 *Toggle ON/OFF*\n\nRegions: ${allRegions.length}\nCities: ${allCities.length}\nCategories: ${allCategories.length}\nProducts: ${allProductNames.length}\n\n✍️ Format: \`name 1|0\``, { parse_mode: "Markdown" }, {});

      case "📣 Broadcast":
        s.adminStep = "broadcast";
        return sendAndTrack(bot, id, "📣 *Enter broadcast message:*", { parse_mode: "Markdown" }, {});

      case "🔙 Back":
        delete s.adminStep;
        return sendAndTrack(bot, id, "🔙 Back to menu.", { parse_mode: "Markdown" }, {});
    }
  } catch (err) {
    console.error("❌ [AdminPanel Fatal]:", err.message || err);
    try {
      await sendAndTrack(bot, id, "❗️ Admin error. Try again.", {}, {});
    } catch {}
  }
}
