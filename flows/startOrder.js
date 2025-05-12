// 📦 flows/startOrder.js | IMMORTAL FINAL v999999999+ULTIMATE — ULTRA-SYNC TANKLOCK MIRROR + 24/7 SAFE RESET DIAMONDLOCK MAX-PERFECTION

import { userSessions, userMessages, userOrders } from "../state/userState.js";
import { sendKeyboard } from "../helpers/messageUtils.js";
import { clearTimers, clearUserMessages } from "../state/stateManager.js";
import { MENU_BUTTONS } from "../helpers/keyboardConstants.js";

// 🌍 Region choices — centralized for uniformity
const REGION_LIST = [
  "🗽 East Coast",
  "🌴 West Coast",
  "🛢️ South",
  "⛰️ Midwest",
  "🌲 Northwest",
  "🏜️ Southwest"
];

/**
 * 🧼 Starts a fully clean order session — safe for retry or new user
 * @param {object} bot - Telegram bot instance
 * @param {string|number} id - Telegram user ID
 * @param {object} [userMsgs] - User message tracking object
 * @returns {Promise<object|null>} - The result of the keyboard send operation
 */
export async function startOrder(bot, id, userMsgs = userMessages) {
  const uid = sanitizeId(id);
  if (!bot || !uid || typeof bot.sendMessage !== "function") {
    logError("❌ [startOrder]", "Invalid bot instance or user ID", uid);
    return null;
  }

  try {
    // 🔁 1. Total reset of previous session state
    await resetUserState(uid);

    // 🔄 2. Initialize clean session
    initializeSession(uid);

    // ⌨️ 3. Show region selector
    const keyboard = buildRegionKeyboard();

    await bot.sendChatAction(uid, "typing").catch(() => {
      logWarning("⚠️ [startOrder]", "Failed to send chat action", uid);
    });

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
      [[MENU_BUTTONS.HELP]],
      userMsgs
    );
  }
}

/**
 * ✅ Resets the user's session, messages, and orders
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
      "paymentInProgress", "cleanupScheduled", "promoCode"
    ];
    for (const key of fieldsToClear) {
      delete userSessions[id][key];
    }
  }
  logAction("🧼 [resetUserState]", "User state fully reset", id);
}

/**
 * ✅ Initializes a clean session for the user
 * @param {string} id - Telegram user ID
 */
function initializeSession(id) {
  userSessions[id] = {
    step: 1,
    createdAt: Date.now()
  };
  logAction("🔄 [initializeSession]", "New session initialized", id);
}

/**
 * ✅ Builds the region selection keyboard
 * @returns {Array<Array<object>>} - Telegram keyboard layout
 */
function buildRegionKeyboard() {
  try {
    const keyboard = REGION_LIST.map(region => {
      if (!region) {
        logError("⚠️ [buildRegionKeyboard]", new Error("Empty region found"));
        return [{ text: "❌ Invalid Region" }]; // Fallback for invalid regions
      }
      return [{ text: region }];
    });

    // Add Help and Back buttons
    keyboard.push([{ text: MENU_BUTTONS.HELP.text, callback_data: "MENU_HELP" }]);
    keyboard.push([{ text: "🔙 Back", callback_data: "MENU_BACK" }]);

    const normalizedKeyboard = normalizeKeyboard(keyboard); // Ensure consistent formatting
    logAction("✅ [buildRegionKeyboard Debug]", JSON.stringify(normalizedKeyboard, null, 2)); // Debugging output
    return normalizedKeyboard;
  } catch (err) {
    logError("❌ [buildRegionKeyboard error]", err);
    return [[{ text: "❌ Error Generating Keyboard" }]]; // Fallback keyboard
  }
}

/**
 * 🧠 Sanitizes user ID input
 * @param {string|number} id - Input ID
 * @returns {string|null} - Sanitized ID or null if invalid
 */
function sanitizeId(id) {
  const uid = String(id || "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}

/**
 * 📝 Logs successful actions
 * @param {string} action - Action description
 * @param {string} message - Additional details
 * @param {string} [uid] - User ID (optional)
 */
function logAction(action, message, uid = null) {
  console.log(`${new Date().toISOString()} ${action} → ${message}${uid ? ` (ID: ${uid})` : ""}`);
}

/**
 * ⚠️ Logs warnings
 * @param {string} action - Action description
 * @param {string} message - Additional details
 * @param {string} [uid] - User ID (optional)
 */
function logWarning(action, message, uid = null) {
  console.warn(`${new Date().toISOString()} ${action} → ${message}${uid ? ` (ID: ${uid})` : ""}`);
}

/**
 * ⚠️ Logs errors
 * @param {string} action - Action description
 * @param {Error|string} error - Error object or message
 * @param {string} [uid] - User ID (optional)
 */
function logError(action, error, uid = null) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (ID: ${uid})` : ""}`);
}

/**
 * ✅ Normalizes keyboard structure (ensures formatting consistency)
 * @param {Array<Array<{ text: string, callback_data?: string }>>} keyboard
 * @returns {Array<Array<{ text: string, callback_data?: string }>>}
 */
function normalizeKeyboard(keyboard) {
  if (!Array.isArray(keyboard)) {
    logError("⚠️ [normalizeKeyboard]", new Error("Invalid keyboard structure"));
    return [];
  }

  return keyboard.map(row => {
    if (Array.isArray(row)) {
      return row.map(button => {
        if (!button?.text) {
          logError("⚠️ [normalizeKeyboard]", new Error("Button missing 'text' property"));
          return { text: "❌ Invalid Button" }; // Fallback for invalid buttons
        }
        return {
          text: String(button.text).trim(),
          callback_data: button.callback_data ? String(button.callback_data).trim() : undefined
        };
      });
    }
    return [{ text: String(row).trim() }];
  });
}
