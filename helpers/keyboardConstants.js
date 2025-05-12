// 📦 helpers/keyboardConstants.js | FINAL IMMORTAL v999999999999.∞+ULTIMATE — SKYLOCKED SYNC-GODMODE + DIAMONDLOCK MAX-PERFECTION

import { BOT } from "../config/config.js";

/**
 * ✅ Centralized button labels (for users and admins)
 */
export const MENU_BUTTONS = {
  BUY: { text: "🛒 Buy", callback_data: "MENU_BUY" },
  PROFILE: { text: "👤 Profile", callback_data: "MENU_PROFILE" },
  ORDERS: { text: "📦 Orders", callback_data: "MENU_ORDERS" },
  HELP: { text: "❓ Help", callback_data: "MENU_HELP" },
  STATS: { text: "📊 Stats", callback_data: "MENU_STATS" },
  ADMIN: { text: "🛠 Admin", callback_data: "MENU_ADMIN" },
};

/**
 * ✅ Fallback keyboard — used as a safe reserve (when others fail)
 */
export const MAIN_KEYBOARD = createKeyboard([
  [MENU_BUTTONS.BUY, MENU_BUTTONS.HELP],
  [MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS],
  [MENU_BUTTONS.STATS, MENU_BUTTONS.ADMIN],
]);

/**
 * ✅ Dynamically generates the main menu (admin-safe)
 * @param {string|number} id — Telegram user ID
 * @returns {object} Telegram keyboard (reply_markup)
 */
export function getMainMenu(id) {
  const uid = safeId(id);
  const adminId = safeId(BOT?.ADMIN_ID);
  const isAdmin = uid === adminId;

  try {
    const rows = [
      [MENU_BUTTONS.BUY, MENU_BUTTONS.HELP],
      [MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS],
    ];

    if (isAdmin) {
      rows.push([MENU_BUTTONS.STATS, MENU_BUTTONS.ADMIN]);
    }

    const keyboard = createKeyboard(rows);
    logAction("✅ [getMainMenu]", `Generated keyboard for user ${uid}${isAdmin ? " (admin)" : ""}`);
    return { reply_markup: keyboard };
  } catch (err) {
    logError("❌ [getMainMenu error]", err, uid);
    // Fallback to MAIN_KEYBOARD
    return MAIN_KEYBOARD;
  }
}

/**
 * ✅ Creates a Telegram keyboard with safe formatting
 * @param {Array<Array<{ text: string, callback_data?: string }>>} rows — Button rows
 * @returns {object} Telegram reply_markup object
 */
function createKeyboard(rows) {
  const normalizedKeyboard = normalizeKeyboard(rows);
  logAction("✅ [createKeyboard]", JSON.stringify(normalizedKeyboard, null, 2)); // Debugging output
  return {
    keyboard: normalizedKeyboard,
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: false,
  };
}

/**
 * ✅ Keyboard normalizer — guarantees safe formatting
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
          callback_data: button.callback_data ? String(button.callback_data).trim() : undefined,
        };
      });
    }
    return [{ text: String(row).trim() }];
  });
}

/**
 * ✅ Safely sanitizes user/admin ID
 * @param {string|number} id
 * @returns {string|null} Sanitized ID or null
 */
function safeId(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}

/**
 * ✅ Logs successful actions
 * @param {string} action — Action description
 * @param {string} message — Additional details
 */
function logAction(action, message) {
  console.log(`${new Date().toISOString()} ${action} → ${message}`);
}

/**
 * ⚠️ Logs errors
 * @param {string} action — Action description
 * @param {Error} error — Error object
 * @param {string} [uid] — User ID (if applicable)
 */
function logError(action, error, uid = null) {
  console.error(
    `${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (ID: ${uid})` : ""}`
  );
}

/**
 * ✅ Creates and normalizes fallback keyboard structure
 * @returns {object} — Basic fallback keyboard
 */
function getFallbackKeyboard() {
  const fallbackKeyboard = {
    keyboard: [[MENU_BUTTONS.HELP]],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true,
  };
  logAction("✅ [getFallbackKeyboard]", JSON.stringify(fallbackKeyboard, null, 2)); // Debugging output
  return fallbackKeyboard;
}
