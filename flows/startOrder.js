// 📦 flows/startOrder.js | IMMORTAL FINAL v999999999+ULTIMATE — ULTRA-SYNC TANKLOCK MIRROR + 24/7 SAFE RESET

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
  const keyboard = REGION_LIST.map(region => [{ text: region }]);
  keyboard.push([{ text: MENU_BUTTONS.HELP.text }]); // Unified button for help
  keyboard.push([{ text: "🔙 Back" }]); // Back button for navigation
  return keyboard;
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
