// 📦 utils/sendHelp.js | IMMORTAL FINAL v999999999.∞ — BULLETPROOF HELP + TELEGRAM UX SYNC

import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * ✅ Rodo pagalbos / saugumo pranešimą naudotojui (Telegram-safe)
 */
export async function sendHelp(bot, id, userMessages = {}) {
  try {
    const uid = String(id || "").trim();
    if (!bot || !uid) return;

    const helpText = `
❓ *HELP & SAFETY RULES:*

1️⃣ *Orders are ONLY processed via this bot*  
🔒 Do not send private messages. Use interface buttons only.

2️⃣ *Do NOT photograph, call, or speak to the courier/dropper*  
📵 Any such attempt = *IMMEDIATE BAN*

3️⃣ *Delivery takes ~20–30 minutes*  
⏱ Follow all steps. Be alert and nearby.

4️⃣ *After delivery: No messages, no photos*  
🧼 Auto-clean triggers ~25–27min after drop.

5️⃣ *Never reply to this bot directly*  
⚠️ Only use interface buttons!

📩 *Support:* balticpharmausa@gmail.com

⚠️ If anything breaks, tap *HELP* again or type */start*
    `.trim();

    await bot.sendChatAction(uid, "typing").catch(() => {});
    return await sendAndTrack(
      bot,
      uid,
      helpText,
      {
        parse_mode: "Markdown",
        disable_web_page_preview: true
      },
      userMessages
    );
  } catch (err) {
    console.error("❌ [sendHelp error]:", err.message || err);
    try {
      await bot.sendMessage(id, "⚠️ Failed to load help. Please try again.");
    } catch (e) {
      console.warn("⚠️ [sendHelp fallback failed]:", e.message);
    }
  }
}
