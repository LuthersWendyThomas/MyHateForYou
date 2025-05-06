// 📦 utils/sendOrders.js | BalticPharma V2 — IMMORTAL v2025.6 DEPLOY POLISH EDITION

import { sendAndTrack } from "../helpers/messageUtils.js";
import { userOrders } from "../state/userState.js";

/**
 * ✅ Parodo naudotojui jo užsakymų statistiką
 */
export async function sendOrders(bot, id, userId, userMessages = {}) {
  try {
    const uid = String(userId);
    const raw = userOrders[uid];
    const count = Number.isInteger(raw) && raw > 0 ? raw : 0;

    let text;

    if (count === 0) {
      text = `
📋 *Neturite jokių užsakymų.*

🛍️ Norėdami atlikti pirmą užsakymą – spauskite *PIRKTI* mygtuką apačioje.

❓ Klausimai? Paspauskite *PAGALBA*.
      `.trim();
    } else {
      const toVip = getMilestone(count);
      const vipLine = toVip === 0
        ? "⭐️ Jūs jau esate *VIP klientas*! Ačiū už lojalumą."
        : `🔁 Atlikite dar *${toVip}* užsakymus iki *VIP statuso*!`;

      text = `
📦 *Jūsų užsakymų statistika:*

✅ Iš viso atlikta: *${count}*
${vipLine}

Ačiū, kad pasitikite *BalticPharma™*
      `.trim();
    }

    return await sendAndTrack(bot, id, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendOrders klaida]:", err.message || err);
    try {
      await bot.sendMessage(id, "❗️ Nepavyko parodyti užsakymų. Bandykite vėliau.");
    } catch {}
  }
}

/**
 * 🔁 Nustato kiek liko iki VIP statuso (milestone sistema)
 */
function getMilestone(count) {
  if (count >= 10) return 0;
  return count >= 5 ? 10 - count : 5 - count;
}
