// 📦 utils/sendHelp.js | BalticPharma V2 — IMMORTAL v2025.6 SYNCED LAYER EDITION

import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * ✅ Displays help and security rules (fully protected)
 */
export async function sendHelp(bot, id, userMessages = {}) {
  try {
    if (!bot || !id) return;

    const text = `
❓ *HELP & SAFETY RULES:*

1️⃣ *Orders are only processed through this bot*  
— No private chats. Use buttons only.

2️⃣ *Do not photograph or talk to courier/drop person*  
— 📵 Any attempt = *BAN*.

3️⃣ *Delivery takes ~20–30 minutes*  
— Be ready and follow all instructions.

4️⃣ *After delivery — no messages or photos!*  
— System will auto-clean everything.

⛔ *Violations = instant BAN*

If you encounter a problem – use */start* or tap *HELP* again.
    `.trim();

    await bot.sendChatAction(id, "typing").catch(() => {});
    return await sendAndTrack(bot, id, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendHelp error]:", err.message || err);
    try {
      await bot.sendMessage(id, "⚠️ Failed to display help information. Please try again later.");
    } catch {}
  }
}
