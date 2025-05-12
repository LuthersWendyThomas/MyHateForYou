// 📦 helpers/menu.js | FINAL IMMORTAL v999999999.∞+1 — SKYLOCKED ADMIN-SAFE SYNCED

import { BOT } from "../config/config.js";
import { MENU_BUTTONS } from "./keyboardConstants.js";

/**
 * ✅ Dynamically generates the main menu for users/admins (keyboard-only structure)
 * 🔐 Safe fallback variant with only `keyboard` (without reply_markup wrapper)
 * 
 * @param {string|number} id — Telegram user ID
 * @returns {object} — Telegram keyboard (without reply_markup)
 */
export function getMainMenu(id) {
  const uid = safeId(id);
  const adminId = safeId(BOT?.ADMIN_ID);
  const isAdmin = uid === adminId;

  try {
    // Dynamically creating the menu based on admin status
    const menu = [
      [MENU_BUTTONS.BUY, MENU_BUTTONS.HELP],
      [MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS]
    ];

    if (isAdmin) {
      menu.push([MENU_BUTTONS.STATS, MENU_BUTTONS.ADMIN]);
    }

    const keyboard = normalizeKeyboard(menu);
    logAction("✅ [getMainMenu]", `Generated menu for user ${uid}${isAdmin ? " (admin)" : ""}`);
    return {
      keyboard,
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: true
    };
  } catch (err) {
    logError("❌ [getMainMenu error]", err, uid);
    // Fallback to a basic menu structure
    return {
      keyboard: normalizeKeyboard([[MENU_BUTTONS.HELP]]),
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: true
    };
  }
}

/**
 * ✅ Normalizes keyboard structure to ensure safe and manageable format.
 * @param {string[][]} keyboard - Rows of the keyboard
 * @returns {string[][]} - Normalized keyboard
 */
function normalizeKeyboard(keyboard) {
  if (!Array.isArray(keyboard)) return [];
  return keyboard.map(row => {
    if (Array.isArray(row)) return row.map(button => String(button).trim());
    return [String(row).trim()];
  });
}

/**
 * 🧠 Safely sanitizes user/admin ID
 * @param {string|number} id
 * @returns {string|null} Sanitized ID or null
 */
function safeId(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
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
