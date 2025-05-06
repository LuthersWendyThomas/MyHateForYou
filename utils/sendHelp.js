// 📦 utils/sendHelp.js | BalticPharma V2 — IMMORTAL v2025.6 SYNCED LAYER EDITION

import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * ✅ Parodo pagalbos ir saugumo taisykles (pilnai apsaugotas)
 */
export async function sendHelp(bot, id, userMessages = {}) {
  try {
    if (!bot || !id) return;

    const text = `
❓ *PAGALBA IR NAUDOJIMO TAISYKLĖS:*

1️⃣ *Užsakymai vykdomi tik per šį botą*  
— Jokio susirašinėjimo atskirai. Naudokite tik mygtukus.

2️⃣ *Kurjeris / drop’as nefotografuojamas ir nešnekinamas*  
— 📵 Visi bandymai = *BAN*.

3️⃣ *Pristatymas vyksta per 20–30 min*  
— Būkite pasiruošę ir laikykitės instrukcijų.

4️⃣ *Po pristatymo — jokių žinučių ar nuotraukų!*  
— Sistema automatiškai išvalo viską.

⛔ *Pažeidimai = BAN be įspėjimo*

Jei iškilo problema – naudokite */start* arba paspauskite *PAGALBA* dar kartą.
    `.trim();

    await bot.sendChatAction(id, "typing").catch(() => {});
    return await sendAndTrack(bot, id, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendHelp klaida]:", err.message || err);
    try {
      await bot.sendMessage(id, "⚠️ Nepavyko parodyti pagalbos informacijos. Bandykite vėliau.");
    } catch {}
  }
}
