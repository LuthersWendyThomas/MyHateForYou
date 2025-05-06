// 📦 utils/sendProfile.js | BalticPharma V2 — IMMORTAL v2025.7 PROFILE FINALIZED EDITION

import { userSessions, userOrders } from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * ✅ Parodo vartotojo profilio suvestinę (kulkom atspari)
 */
export async function sendProfile(bot, id, userMessages = {}) {
  try {
    const uid = String(id);
    const session = typeof userSessions[uid] === "object" ? userSessions[uid] : {};
    const orderCount = typeof userOrders[uid] === "number" ? userOrders[uid] : 0;

    const chat = await bot.getChat(id);
    const username = chat?.username ? `@${chat.username}` : "NĖRA";

    const status =
      orderCount >= 10 ? "⭐️ *VIP klientas*" :
      orderCount >= 5  ? "🔁 *Artėjate prie VIP!*" :
                        "🚀 *Naujas vartotojas*";

    const profile = `
👤 *Jūsų profilis:*

🔗 T. Username: *${username}*
🏷️ Statusas: ${status}
📦 Užsakymų atlikta: *${orderCount}*
    `.trim();

    return await sendAndTrack(bot, uid, profile, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendProfile klaida]:", err.message || err);
    try {
      await bot.sendMessage(id, "⚠️ Nepavyko gauti profilio informacijos.");
    } catch {}
  }
}
