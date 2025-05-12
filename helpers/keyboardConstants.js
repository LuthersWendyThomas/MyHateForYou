// 📦 helpers/keyboardConstants.js | FINAL IMMORTAL v999999999999.∞+1 — SYNC-GODMODE DIAMONDLOCK MAX-PERFECTION

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
  const uid = String(id || "").trim();
  const adminId = String(BOT?.ADMIN_ID || "").trim();
  const isAdmin = uid === adminId;

  try {
    const rows = [
      [MENU_BUTTONS.BUY, MENU_BUTTONS.HELP],
      [MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS]
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
 * @param {string[][]} rows — Button rows
 * @returns {object} Telegram reply_markup object
 */
function createKeyboard(rows) {
  return {
    keyboard: normalizeKeyboard(rows),
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: false
  };
}

/**
 * ✅ Keyboard normalizer — guarantees safe formatting
 * @param {string[][]} keyboard
 * @returns {string[][]}
 */
function normalizeKeyboard(keyboard) {
  if (!Array.isArray(keyboard)) return [];
  return keyboard.map(row => {
    if (Array.isArray(row)) return row.map(button => String(button).trim());
    return [String(row).trim()];
  });
}

/**
 * 📝 Logs successful actions
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
    `${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (uid: ${uid})` : ""}`
  );
}

function getFallbackKeyboard() {
  return {
    keyboard: [[{ text: "❓ Help" }]],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true,
  };
}
