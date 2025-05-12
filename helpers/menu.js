// 📦 helpers/menu.js | FINAL IMMORTAL v9999999999.∞+FIX — SKYLOCKED ADMIN-SAFE SYNCED + BULLETPROOF BUTTONS

import { BOT } from "../config/config.js";
import { MENU_BUTTONS } from "./keyboardConstants.js";

/**
 * ✅ Dynamically generates the main menu for users/admins (keyboard-only structure)
 * 🔐 Safe fallback variant with only `keyboard` (without reply_markup wrapper)
 * 
 * @param {string|number} id — Telegram user ID
 * @returns {object} — Telegram keyboard (with proper reply_markup structure)
 */
export function getMainMenu(id) {
  const uid = safeId(id);
  const adminId = safeId(BOT?.ADMIN_ID);
  const isAdmin = uid === adminId;

  try {
    // Main user menu
    const userMenu = [
      [MENU_BUTTONS.BUY, MENU_BUTTONS.HELP],
      [MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS],
    ];

    // Admin-specific menu
    const adminMenu = [
      [MENU_BUTTONS.STATS, MENU_BUTTONS.ADMIN],
    ];

    // Combine menus based on user role
    const keyboard = isAdmin ? [...userMenu, ...adminMenu] : userMenu;

    logAction(
      "✅ [getMainMenu]",
      `Generated main menu for user ${uid}${isAdmin ? " (admin)" : ""}`
    );

    const normalizedKeyboard = normalizeKeyboard(keyboard); // Ensure consistent formatting
    logAction("✅ [getMainMenu Debug]", JSON.stringify(normalizedKeyboard, null, 2)); // Debugging output

    // Return the final keyboard
    return {
      keyboard: normalizedKeyboard,
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: true,
    };
  } catch (err) {
    logError("❌ [getMainMenu error]", err, uid);
    // Fallback to a basic menu structure
    return getFallbackKeyboard();
  }
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
 * ✅ Dynamically generates inline keyboard structures for specific use cases
 * @param {Array<{ text: string, callback_data: string }[]>} inlineButtons - Inline buttons
 * @returns {object} - Inline keyboard markup
 */
export function getInlineKeyboard(inlineButtons) {
  try {
    if (!Array.isArray(inlineButtons)) {
      throw new Error("Invalid inline keyboard structure");
    }

    const inlineKeyboard = inlineButtons.map(row =>
      row.map(button => {
        if (!button.text || !button.callback_data) {
          logError("⚠️ [getInlineKeyboard]", new Error("Invalid button structure"));
          return { text: "❌ Invalid Button", callback_data: "INVALID" }; // Fallback for invalid buttons
        }
        return {
          text: String(button.text).trim(),
          callback_data: String(button.callback_data).trim(),
        };
      })
    );

    logAction("✅ [getInlineKeyboard]", JSON.stringify(inlineKeyboard, null, 2)); // Debugging output
    return { inline_keyboard: inlineKeyboard };
  } catch (err) {
    logError("❌ [getInlineKeyboard error]", err);
    return { inline_keyboard: [] }; // Fallback to an empty inline keyboard
  }
}

/**
 * ✅ Validates main menu buttons to ensure functionality
 * @param {object} keyboard — Keyboard object
 * @returns {boolean} - True if valid, false otherwise
 */
export function validateMenuButtons(keyboard) {
  if (!keyboard || !Array.isArray(keyboard.keyboard)) {
    logError("❌ [validateMenuButtons]", new Error("Invalid keyboard format"));
    return false;
  }

  const allButtons = keyboard.keyboard.flat();
  const valid = allButtons.every(button =>
    typeof button.text === "string" && button.text.trim().length > 0
  );

  if (!valid) {
    logError("❌ [validateMenuButtons]", new Error("Invalid buttons found in menu"));
  } else {
    logAction("✅ [validateMenuButtons]", "All menu buttons are valid");
  }

  return valid;
}
