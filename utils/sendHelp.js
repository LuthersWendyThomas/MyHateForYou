import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * ✅ Displays help and safety rules (UX-synced + email fallback)
 */
export async function sendHelp(bot, id, userMessages = {}) {
  try {
    const uid = String(id || "").trim();
    if (!bot || !uid) return;

    const helpText = `
❓ *HELP & SAFETY RULES:*

1️⃣ *Orders are ONLY processed via this bot*  
🔒 No private chats. Use interface buttons only.

2️⃣ *Do NOT photograph or speak to the courier/dropper*  
📵 Any attempt = *INSTANT BAN*

3️⃣ *Delivery takes ~20–30 minutes*  
⏱ Follow instructions and be ready.

4️⃣ *After delivery: No messages, no photos!*  
🧼 Auto-clean triggers in 25–27min.

⛔ *Any violations = ban / blacklist*

⚠️ If something breaks, use */start* or tap *HELP* again.
    `.trim();

    const emailURL = encodeURI(
      `mailto:balticpharmausa@gmail.com?subject=BalticPharmacyBot Support&body=Hello,%20I%20need%20help%20with%20my%20order.%20Please%20assist.`
    );

    await bot.sendChatAction(uid, "typing").catch(() => {});
    return await sendAndTrack(bot, uid, helpText, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📬 Contact support",
              url: emailURL
            }
          ]
        ]
      }
    }, userMessages);

  } catch (err) {
    console.error("❌ [sendHelp error]:", err.message || err);
    try {
      await bot.sendMessage(id, "⚠️ Failed to load help. Please try again.");
    } catch (e) {
      console.warn("⚠️ [sendHelp fallback failed]:", e.message);
    }
  }
}
