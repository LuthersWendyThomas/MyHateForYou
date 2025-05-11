// 📛 utils/punishUser.js | IMMORTAL FINAL v999999999.∞ — BULLETPROOF SHIELD + AUTO-DELETE SYNCED LOCKED

import { sendAndTrack } from "../helpers/messageUtils.js";
import { autodeleteEnabled } from "../config/features.js";
import { userMessages } from "../state/userState.js";

/**
 * ⚠️ Warns user for invalid actions
 * Auto-deletes the warning if feature is enabled
 */
export async function punish(bot, id, messages = userMessages) {
  try {
    if (!bot || !id) return;

    const uid = String(id).trim();
    if (!uid || uid === "undefined" || uid === "null") return;

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
      setTimeout(async () => {
        try {
          await bot.deleteMessage(uid, messageId);
          if (process.env.DEBUG_MESSAGES === "true") {
            console.log(`🗑️ [punish] Deleted warning → ${uid} :: ${messageId}`);
          }
        } catch (err) {
          console.warn(`⚠️ [punish] Failed to delete message #${messageId}:`, err.message);
        }
      }, 3000);
    }
  } catch (err) {
    console.error("❌ [punish error]:", err.message || err);
  }
}
