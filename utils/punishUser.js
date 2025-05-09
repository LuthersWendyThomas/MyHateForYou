// 📛 utils/punishUser.js | IMMORTAL v3.0 — WARNING SHIELD SYNCED

import { sendAndTrack } from "../helpers/messageUtils.js";
import { FLAGS } from "../config/config.js";
import { userMessages } from "../state/userState.js";

/**
 * Sends a warning if user input is invalid (and deletes it after 3s if autodelete enabled)
 */
export async function punish(bot, id, messages = userMessages) {
  try {
    if (!bot || !id) return;

    const uid = String(id).trim();
    const warning = "⚠️ *Invalid action.*\nPlease use the *buttons below*.";

    const msg = await sendAndTrack(
      bot,
      uid,
      warning,
      {
        parse_mode: "Markdown",
        disable_notification: true
      },
      messages
    );

    const autodelete = ["1", "true"].includes(String(FLAGS.AUTODELETE_ENABLED).toLowerCase());
    const messageId = msg?.message_id;

    if (autodelete && messageId) {
      setTimeout(() => {
        bot.deleteMessage(uid, messageId).catch(err =>
          console.warn(`⚠️ Failed to delete punish message (${messageId}):`, err.message)
        );
      }, 3000);
    }

  } catch (err) {
    console.error("❌ [punishUser error]:", err.message || err);
  }
}
