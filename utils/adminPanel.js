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
 * Atidaro pagrindinį admin panelės meniu su visais valdymo mygtukais
 */
export async function openAdminPanel(bot, id) {
  try {
    const keyboard = [
      [{ text: "📊 STATISTIKA" }],
      [{ text: "📅 Šiandien" }, { text: "🗓️ Savaitė" }, { text: "📆 Mėnuo" }],
      [{ text: "🔒 BAN naudotoją" }, { text: "⏳ Temp. BAN" }],
      [{ text: "✅ UNBAN naudotoją" }, { text: "🧹 Valyti BAN" }],
      [{ text: "📋 BAN sąrašas" }, { text: "⏱️ Laikini BAN'ai" }],
      [{ text: "🔙 Atgal" }]
    ];

    await sendAndTrack(
      bot,
      id,
      "🛠️ *Admin panelė aktyvuota*\nPasirinkite veiksmą naudodamiesi mygtukais:",
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
    console.error("❌ [openAdminPanel klaida]:", err.message);
  }
}

/**
 * Apdoroja visus admin mygtukus ir step'inius veiksmus
 */
export async function handleAdminAction(bot, msg, userSessions, userOrders) {
  try {
    const id = msg?.chat?.id;
    const text = msg?.text?.trim();

    if (!id || String(id) !== String(BOT.ADMIN_ID) || !text) return;

    const session = userSessions[id] ||= {};

    // Step-based: BAN naudotojas
    if (session.adminStep === "ban_user") {
      banUser(text);
      delete session.adminStep;
      return await sendAndTrack(bot, id, `🚫 Užbanintas naudotojas: \`${text}\``, { parse_mode: "Markdown" }, {});
    }

    // Step-based: Temp. ban
    if (session.adminStep === "temp_ban") {
      const [targetId, minutesRaw] = text.split(" ");
      const minutes = parseInt(minutesRaw);
      if (!targetId || isNaN(minutes) || minutes < 1) {
        return await sendAndTrack(bot, id, "⚠️ Netinkamas formatas. Naudok: `123456789 10`", { parse_mode: "Markdown" }, {});
      }
      banUserTemporary(targetId, minutes);
      delete session.adminStep;
      return await sendAndTrack(bot, id, `⏳ Laikinas banas: \`${targetId}\` (${minutes} min)`, { parse_mode: "Markdown" }, {});
    }

    // Step-based: UNBAN
    if (session.adminStep === "unban_user") {
      unbanUser(text);
      delete session.adminStep;
      return await sendAndTrack(bot, id, `✅ Atbanintas naudotojas: \`${text}\``, { parse_mode: "Markdown" }, {});
    }

    // Main mygtukai
    switch (text) {
      case "📊 STATISTIKA":
      case "📅 Šiandien":
      case "🗓️ Savaitė":
      case "📆 Mėnuo": {
        const stats = await getStats("admin");
        let msg = "📊 *Statistika:*\n\n";
        if (text === "📊 STATISTIKA" || text === "📅 Šiandien") msg += `📅 Šiandien: *${stats.today.toFixed(2)}€*\n`;
        if (text === "📊 STATISTIKA" || text === "🗓️ Savaitė") msg += `🗓️ Savaitė: *${stats.week.toFixed(2)}€*\n`;
        if (text === "📊 STATISTIKA" || text === "📆 Mėnuo") msg += `📆 Mėnuo: *${stats.month.toFixed(2)}€*\n`;
        msg += `💰 Viso: *${stats.total.toFixed(2)}€*`;

        return await sendAndTrack(bot, id, msg, { parse_mode: "Markdown" }, {});
      }

      case "🔒 BAN naudotoją":
        session.adminStep = "ban_user";
        return await sendAndTrack(bot, id, "🔒 Įveskite naudotojo ID kurį norite *užbaninti*:", { parse_mode: "Markdown" }, {});

      case "⏳ Temp. BAN":
        session.adminStep = "temp_ban";
        return await sendAndTrack(bot, id, "⏳ Įveskite naudotojo ID ir trukmę minutėmis (pvz: `123456789 10`):", { parse_mode: "Markdown" }, {});

      case "✅ UNBAN naudotoją":
        session.adminStep = "unban_user";
        return await sendAndTrack(bot, id, "✅ Įveskite naudotojo ID kurį norite *atbaninti*:", { parse_mode: "Markdown" }, {});

      case "🧹 Valyti BAN":
        clearBans();
        return await sendAndTrack(bot, id, "🧹 *Visi permanent ban'ai pašalinti.*", { parse_mode: "Markdown" }, {});

      case "📋 BAN sąrašas": {
        const list = listBannedUsers();
        const formatted = list.length
          ? list.map(id => `- \`${id}\``).join("\n")
          : "_(Tuščia)_";
        return await sendAndTrack(bot, id, `📋 *Užblokuoti naudotojai:*\n${formatted}`, { parse_mode: "Markdown" }, {});
      }

      case "⏱️ Laikini BAN'ai": {
        const list = listTemporaryBans();
        const formatted = list.length
          ? list.map(b => `- \`${b.userId}\` iki ${b.until}`).join("\n")
          : "_(Tuščia)_";
        return await sendAndTrack(bot, id, `⏱️ *Laikinai užblokuoti:*\n${formatted}`, { parse_mode: "Markdown" }, {});
      }

      case "🔙 Atgal":
        delete session.adminStep;
        return await sendAndTrack(bot, id, "🔙 Grįžote į pagrindinį meniu.", { parse_mode: "Markdown" }, {});
    }
  } catch (err) {
    console.error("❌ [handleAdminAction klaida]:", err.message || err);
    if (msg?.chat?.id) {
      await sendAndTrack(bot, msg.chat.id, "❗️ Klaida apdorojant veiksmą. Bandykite dar kartą.", {}, {});
    }
  }
}
