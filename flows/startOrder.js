// 📦 flows/startOrder.js | IMMORTAL FINAL v999999999.∞+GODMODE DIAMONDLOCK
// ULTRA-FSM SYNC • TANKLOCK SESSION RESET • MAXIMUM STABILITY • 24/7 BULLETPROOF

import { userSessions, userMessages, userOrders } from "../state/userState.js";
import { sendKeyboard } from "../helpers/messageUtils.js";
import { clearTimers, clearUserMessages } from "../state/stateManager.js";
import { MENU_BUTTONS } from "../helpers/keyboardConstants.js";

/**
 * 🚀 Starts a fully clean order session — safe for retry, fallback, FSM sync
 * @param {object} bot - Telegram bot instance
 * @param {string|number} id - Telegram user ID
 * @param {object} [userMsgs] - Optional message tracking object
 */
export async function startOrder(bot, id, userMsgs = userMessages) {
  const uid = sanitizeId(id);
  if (!bot || !uid || typeof bot.sendMessage !== "function") {
    logError("❌ [startOrder]", "Invalid bot or UID", uid);
    return null;
  }

  try {
    // 🧼 Step 1 — Clean reset of all user data
    await resetUserState(uid);

    // 🔄 Step 2 — Start new FSM session
    initializeSession(uid);

    // ⌨️ Step 3 — Build and send region selection keyboard
    const keyboard = buildRegionKeyboard();
    await bot.sendChatAction(uid, "typing").catch(() => {});

    return await sendKeyboard(
      bot,
      uid,
      "🗺 *Select the region where delivery is needed:*",
      keyboard,
      userMsgs
    );
  } catch (err) {
    logError("❌ [startOrder error]", err, uid);
    return await sendKeyboard(
      bot,
      uid,
      "❗️ Unexpected error. Please try again.",
      [[{ text: MENU_BUTTONS.HELP.text }]],
      userMsgs
    );
  }
}

/**
 * 🧼 Clears all session-related user data before fresh order
 * @param {string} id - Telegram user ID
 */
async function resetUserState(id) {
  await clearTimers(id);
  await clearUserMessages(id);

  delete userOrders[id];
  delete userMessages[id];

  if (userSessions[id]) {
    const fieldsToClear = [
      "step", "region", "city", "deliveryMethod", "deliveryFee",
      "category", "product", "quantity", "unitPrice", "totalPrice",
      "currency", "wallet", "expectedAmount", "paymentTimer",
      "paymentInProgress", "cleanupScheduled", "promoCode",
      "adminStep", "lastText"
    ];
    for (const key of fieldsToClear) {
      delete userSessions[id][key];
    }
  }

  logAction("🧼 [resetUserState]", "State cleared", id);
}

/**
 * 🔄 Initializes a new session for FSM
 * @param {string} id - Telegram user ID
 */
function initializeSession(id) {
  userSessions[id] = {
    step: 1,
    createdAt: Date.now()
  };
  logAction("🔄 [initializeSession]", "New session started", id);
}

/**
 * 🧠 Sanitizes Telegram user ID
 * @param {string|number} id
 * @returns {string|null}
 */
function sanitizeId(id) {
  const uid = String(id || "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}

/**
 * ✅ Builds bulletproof region selector keyboard with fallback validation
 * @returns {Array<Array<{text: string, callback_data?: string}>>}
 */
function buildRegionKeyboard() {
  try {
    const keyboard = REGION_LIST.map(region => {
      if (!region || typeof region !== "string") {
        logError("⚠️ [buildRegionKeyboard]", new Error("Invalid region detected"));
        return [{ text: "❌ Invalid Region" }];
      }
      return [{ text: region }];
    });

    keyboard.push([{ text: MENU_BUTTONS.HELP.text }]);
    keyboard.push([{ text: "🔙 Back" }]);

    const normalized = normalizeKeyboard(keyboard);
    logAction("✅ [buildRegionKeyboard]", JSON.stringify(normalized, null, 2));
    return normalized;
  } catch (err) {
    logError("❌ [buildRegionKeyboard error]", err);
    return [[{ text: "❌ Error building keyboard" }]];
  }
}

/**
 * ✅ Ensures keyboard buttons have valid structure
 * @param {Array<Array<{text: string, callback_data?: string}>>} keyboard
 * @returns {Array<Array<{text: string, callback_data?: string}>>}
 */
function normalizeKeyboard(keyboard) {
  if (!Array.isArray(keyboard)) {
    logError("⚠️ [normalizeKeyboard]", new Error("Invalid keyboard structure"));
    return [];
  }

  return keyboard.map(row => {
    if (!Array.isArray(row)) return [{ text: String(row).trim() }];
    return row.map(button => {
      if (!button?.text) {
        logError("⚠️ [normalizeKeyboard]", new Error("Missing button text"));
        return { text: "❌ Invalid Button" };
      }
      return {
        text: String(button.text).trim(),
        callback_data: button.callback_data ? String(button.callback_data).trim() : undefined
      };
    });
  });
}

/**
 * 📝 Standard log for successful operations
 */
function logAction(action, message, uid = null) {
  console.log(`${new Date().toISOString()} ${action} → ${message}${uid ? ` (ID: ${uid})` : ""}`);
}

/**
 * ⚠️ Standard error logger
 */
function logError(action, error, uid = null) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (ID: ${uid})` : ""}`);
}

// 🌍 Centralized region list
const REGION_LIST = [
  "🗽 East Coast",
  "🌴 West Coast",
  "🛢️ South",
  "⛰️ Midwest",
  "🌲 Northwest",
  "🏜️ Southwest"
];
