// 📦 utils/adminPanel.js | FINAL IMMORTAL ADMINLOCK v999999999.∞ — BULLETPROOF SYNC + LIVE USER COUNT + DISCOUNT CONTROL + BROADCAST SYSTEM

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
  DISCOUNT_TYPES
} from "../config/discounts.js";
import {
  allCategories,
  allProductNames,
  getCategoryMap,
  products
} from "../config/products.js";
import {
  allRegions,
  allCities,
  REGION_MAP
} from "../config/regions.js";
import { startBroadcast } from "./adminBroadcast.js";

export async function openAdminPanel(bot, id) {
  try {
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

    if (s.adminStep === "toggle_manage") {
      const [target, statusRaw] = text.split(" ");
      const status = statusRaw === "1";

      if (REGION_MAP[target]) {
        REGION_MAP[target].active = status;
      } else if (allCities.includes(target)) {
        for (const region of Object.values(REGION_MAP)) {
          if (region.cities?.[target] !== undefined) {
            region.cities[target] = status;
            break;
          }
        }
      } else if (allCategories.includes(target)) {
        for (const p of products[target] || []) {
          p.active = status;
        }
      } else if (allProductNames.includes(target)) {
        const cat = getCategoryMap[target];
        if (cat) {
          const product = products[cat]?.find(p => p.name === target);
          if (product) product.active = status;
        }
      } else {
        return await sendAndTrack(bot, id, `❌ Unknown item: \`${target}\``, { parse_mode: "Markdown" }, {});
      }

      delete s.adminStep;
      return await sendAndTrack(bot, id, `🟢 Toggle updated: \`${target}\` → ${status ? "ON ✅" : "OFF ❌"}`, { parse_mode: "Markdown" }, {});
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

      case "🟢 Toggle Items": {
        s.adminStep = "toggle_manage";
        return await sendAndTrack(bot, id,
          `🟢 *Toggle items ON/OFF*\n
Available targets:
• Regions: ${allRegions.length}
• Cities: ${allCities.length}
• Categories: ${allCategories.length}
• Products: ${allProductNames.length}

✍️ *Input format:* 
\`name 1\` = ON
\`name 0\` = OFF

*Examples:*
\`New York 0\`
\`🔥 Zaza (Exotic Indoor) 1\`
\`🌿 Cannabis 0\`
\`🗽 East Coast 1\``,
          { parse_mode: "Markdown" }, {});
      }

      case "📣 Broadcast":
        s.adminStep = "broadcast";
        return await sendAndTrack(bot, id, "📣 *Enter message to broadcast to all users:*", { parse_mode: "Markdown" }, {});

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
