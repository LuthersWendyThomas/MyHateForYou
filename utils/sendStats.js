// 📦 utils/sendStats.js | BalticPharma V2 — IMMORTAL v2025.6 FINAL TELEMETRY CORE LOCK

import { userOrders, userSessions, activeUsers } from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { BOT } from "../config/config.js";

/**
 * ✅ Parodo statistiką (admin arba naudotojui)
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

      const now = new Date().toLocaleString("lt-LT", {
        hour: "2-digit",
        minute: "2-digit"
      });

      const adminStats = `
📊 *ADMIN Statistika:*

👤 *Aktyvūs naudotojai:* ${activeCount}
📦 *Užsakymų atlikta:* ${totalOrders}
🧠 *Aktyvios sesijos:* ${totalUsers}

⏱ *Atnaujinta:* ${now}
      `.trim();

      return await sendAndTrack(bot, id, adminStats, {
        parse_mode: "Markdown",
        disable_web_page_preview: true
      }, userMessages);
    }

    const userOrderCount = Number(userOrders[uid]) || 0;

    const userStats = `
📦 *Jūsų statistika:*

✅ Įvykdytų užsakymų: *${userOrderCount}*
⏱ Stebėjimas aktyvus nuo pirmo užsakymo.

🔒 Visi duomenys laikomi tik lokaliai — *jokių asmens duomenų nesaugoma*.
    `.trim();

    return await sendAndTrack(bot, id, userStats, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendStats klaida]:", err.message || err);
    return await sendAndTrack(bot, id, "⚠️ Nepavyko gauti statistikos.", {}, userMessages);
  }
}
