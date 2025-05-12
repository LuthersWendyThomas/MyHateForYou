// 📛 utils/punishUser.js | IMMORTAL FINAL v999999999.∞+2 — BULLETPROOF SHIELD + AUTO-DELETE SYNCED LOCKED

import { sendAndTrack } from "../helpers/messageUtils.js";
import { autodeleteEnabled } from "../config/features.js";
import { userSessions, userMessages } from "../state/userState.js";
import { MAIN_KEYBOARD } from "../helpers/keyboardConstants.js";

/**
 * ⚠️ Warns user for invalid actions
 * Auto-deletes the warning if feature is enabled and ensures users see the main menu.
 * @param {object} bot - Telegram bot instance
 * @param {string|number} id - User ID
 * @param {object} messages - User message tracking
 */
export async function punish(bot, id, messages = userMessages) {
  try {
    if (!bot || !id) {
      console.warn("⚠️ [punish] Invalid bot or user ID provided.");
      return;
    }

    const uid = String(id).trim();
    if (!uid || uid === "undefined" || uid === "null") {
      console.warn(`⚠️ [punish] Invalid UID received: ${uid}`);
      return;
    }

    // Validate and reset session if needed
    validateUserSession(uid);

    const warning = "⚠️ *Invalid action.*\nPlease use the *buttons below*.";
    const keyboard = MAIN_KEYBOARD || getFallbackKeyboard();

    // Send warning message
    const msg = await sendAndTrack(
      bot,
      uid,
      warning,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      },
      messages
    );

    const messageId = msg?.message_id;
    const shouldDelete = autodeleteEnabled?.status === true;

    // Auto-delete message if feature is enabled
    if (shouldDelete && messageId) {
      setTimeout(async () => {
        try {
          await bot.deleteMessage(uid, messageId);
          if (process.env.DEBUG_MESSAGES === "true") {
            console.log(`🗑️ [punish] Deleted warning → ${uid} :: ${messageId}`);
          }
        } catch (err) {
          console.warn(`⚠️ [punish] Failed to delete message #${messageId}: ${err.message}`);
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
  try {
    if (!userSessions[uid]) {
      userSessions[uid] = { step: 1, createdAt: Date.now() };
    }

    const session = userSessions[uid];
    if (!isValidStep(session.step)) {
      console.warn(`⚠️ Invalid step "${session.step}" for user ${uid}. Resetting to step 1.`);
      session.step = 1;
    }
  } catch (err) {
    console.error("❌ [validateUserSession error]:", err.message || err);
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

/**
 * ✅ Provides a fallback keyboard when MAIN_KEYBOARD is unavailable
 * @returns {object} - Fallback keyboard structure
 */
function getFallbackKeyboard() {
  return {
    keyboard: [[{ text: "❓ Help" }]],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true,
  };
}
