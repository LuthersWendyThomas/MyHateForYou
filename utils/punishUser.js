// 📛 utils/punishUser.js | IMMORTAL v3.1 — FINAL BULLETPROOF SHIELD SYNCED

import { sendAndTrack } from "../helpers/messageUtils.js";
import { autodeleteEnabled } from "../config/features.js";
import { userMessages } from "../state/userState.js";

/**
 * ⚠️ Warns user about invalid action
 * Deletes the warning message after 3s if autodelete is enabled
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

    const messageId = msg?.message_id;
    const shouldDelete = autodeleteEnabled?.status === true;

    if (shouldDelete && messageId) {
      setTimeout(() => {
        bot.deleteMessage(uid, messageId).catch(err => {
          console.warn(`⚠️ Failed to delete punish message (${messageId}):`, err.message);
        });
      }, 3000);
    }

  } catch (err) {
    console.error("❌ [punish error]:", err.message || err);
  }
}
