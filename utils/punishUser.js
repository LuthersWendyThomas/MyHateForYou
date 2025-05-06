// 📛 utils/punishUser.js | BalticPharma V2 — BULLETPROOF v2.1 IMMORTAL-SYNCED FINAL BUILD

import { sendAndTrack } from "../helpers/messageUtils.js";
import { FLAGS } from "../config/config.js";
import { userMessages } from "../state/userState.js";

/**
 * Reacts to invalid input — sends a warning, tracks the message, deletes after 3s (if enabled)
 * @param {TelegramBot} bot - Bot instance
 * @param {number|string} id - Telegram user ID
 * @param {Object=} messages - Tracked messages (default: userMessages)
 */
export async function punish(bot, id, messages = userMessages) {
  try {
    if (!bot || !id) return;

    const warning = "⚠️ *Invalid action.*\nPlease use the *buttons below*.";

    const msg = await sendAndTrack(
      bot,
      id,
      warning,
      {
        parse_mode: "Markdown",
        disable_notification: true
      },
      messages
    );

    const canDelete = FLAGS.AUTODELETE_ENABLED === true;
    const messageId = msg?.message_id;

    if (canDelete && messageId) {
      setTimeout(() => {
        bot.deleteMessage(id, messageId).catch((err) =>
          console.warn(`⚠️ Failed to delete punish message (${messageId}):`, err.message)
        );
      }, 3000);
    }

  } catch (err) {
    console.error("❌ [punishUser error]:", err.message || err);
  }
}
