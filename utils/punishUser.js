// 📛 utils/punishUser.js | IMMORTAL FINAL v999999999.∞+1 — BULLETPROOF SHIELD + AUTO-DELETE SYNCED LOCKED

import { sendAndTrack } from "../helpers/messageUtils.js";
import { autodeleteEnabled } from "../config/features.js";
import { userSessions, userMessages } from "../state/userState.js";
import { MAIN_KEYBOARD } from "../helpers/keyboardConstants.js";

/**
 * ⚠️ Warns user for invalid actions
 * Auto-deletes the warning if feature is enabled and ensures users see the main menu.
 */
export async function punish(bot, id, messages = userMessages) {
  try {
    if (!bot || !id) return;

    const uid = String(id).trim();
    if (!uid || uid === "undefined" || uid === "null") return;

    // Validate and reset session if needed
    validateUserSession(uid);

    const warning = "⚠️ *Invalid action.*\nPlease use the *buttons below*.";
await sendAndTrack(
  bot,
  uid,
  warning,
  {
    parse_mode: "Markdown",
    reply_markup: MAIN_KEYBOARD || getFallbackKeyboard(),
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

/**
 * ✅ Validates and resets user session if invalid
 * @param {string} uid - User ID
 */
function validateUserSession(uid) {
  if (!userSessions[uid]) {
    userSessions[uid] = { step: 1, createdAt: Date.now() };
  }

  const session = userSessions[uid];
  if (!isValidStep(session.step)) {
    console.warn(`⚠️ Invalid step "${session.step}" for user ${uid}. Resetting to step 1.`);
    session.step = 1;
  }
}

/**
 * ✅ Checks if a step value is valid
 * @param {number} step - Step value to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidStep(step) {
  return Number.isInteger(step) && step >= 1 && step <= 9;
}
