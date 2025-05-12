// 📦 helpers/menu.js | FINAL IMMORTAL v99999999999.∞+ULTRA-SYNC+DIAMONDLOCK
// SKYLOCKED ADMIN-SAFE BULLETPROOF MENU SYSTEM — MAX BUTTON VALIDATION + INLINE + FALLBACK

import { BOT } from "../config/config.js";
import { MENU_BUTTONS } from "./keyboardConstants.js";

/**
 * ✅ Generates user/admin main menu (safe formatting, full validation)
 * @param {string|number} id - Telegram user ID
 * @returns {object} - Telegram keyboard (reply_markup)
 */
export function getMainMenu(id) {
  const uid = safeId(id);
  const adminId = safeId(BOT?.ADMIN_ID);
  const isAdmin = uid === adminId;

  try {
    const userMenu = [
      [MENU_BUTTONS.BUY, MENU_BUTTONS.HELP],
      [MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS],
    ];

    const adminMenu = [
      [MENU_BUTTONS.STATS, MENU_BUTTONS.ADMIN],
    ];

    const fullMenu = isAdmin ? [...userMenu, ...adminMenu] : userMenu;
    const normalized = normalizeKeyboard(fullMenu);

    logAction("✅ [getMainMenu]", `Generated main menu for ${uid}${isAdmin ? " (admin)" : ""}`);
    return {
      keyboard: normalized,
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: true,
    };
  } catch (err) {
    logError("❌ [getMainMenu error]", err, uid);
    return getFallbackKeyboard();
  }
}

/**
 * ✅ Inline keyboard generator with strict validation
 * @param {Array<Array<{ text: string, callback_data: string }>>} inlineButtons
 * @returns {object} Inline keyboard markup
 */
export function getInlineKeyboard(inlineButtons) {
  try {
    if (!Array.isArray(inlineButtons)) throw new Error("Invalid inline structure");

    const keyboard = inlineButtons.map(row =>
      row.map(btn => {
        if (!btn.text || !btn.callback_data) {
          logError("⚠️ [getInlineKeyboard]", new Error("Missing button data"));
          return { text: "❌ Invalid", callback_data: "INVALID" };
        }
        return {
          text: String(btn.text).trim(),
          callback_data: String(btn.callback_data).trim(),
        };
      })
    );

    logAction("✅ [getInlineKeyboard]", JSON.stringify(keyboard, null, 2));
    return { inline_keyboard: keyboard };
  } catch (err) {
    logError("❌ [getInlineKeyboard error]", err);
    return { inline_keyboard: [] };
  }
}

/**
 * ✅ Validates a full keyboard (standard layout)
 * @param {object} keyboard - Telegram keyboard structure
 * @returns {boolean}
 */
export function validateMenuButtons(keyboard) {
  if (!keyboard || !Array.isArray(keyboard.keyboard)) {
    logError("❌ [validateMenuButtons]", new Error("Invalid keyboard wrapper"));
    return false;
  }

  const buttons = keyboard.keyboard.flat();
  const valid = buttons.every(b => typeof b.text === "string" && b.text.trim().length > 0);

  if (!valid) {
    logError("❌ [validateMenuButtons]", new Error("One or more buttons invalid"));
  } else {
    logAction("✅ [validateMenuButtons]", "All buttons valid");
  }

  return valid;
}

/**
 * ✅ Returns fallback keyboard when formatting fails
 * @returns {object}
 */
export function getFallbackKeyboard() {
  const kb = {
    keyboard: [[MENU_BUTTONS.HELP]],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true,
  };
  logAction("✅ [getFallbackKeyboard]", JSON.stringify(kb, null, 2));
  return kb;
}

/**
 * ✅ Normalizes any keyboard layout (text-only)
 * @param {Array<Array<{ text: string, callback_data?: string }>>} raw
 * @returns {Array<Array<{ text: string }>>}
 */
function normalizeKeyboard(raw) {
  if (!Array.isArray(raw)) {
    logError("⚠️ [normalizeKeyboard]", new Error("Invalid structure"));
    return [];
  }

  return raw.map(row => {
    if (!Array.isArray(row)) return [];
    return row.map(btn => {
      if (!btn?.text) {
        logError("⚠️ [normalizeKeyboard]", new Error("Missing 'text' in button"));
        return { text: "❌ Invalid Button" };
      }
      return { text: String(btn.text).trim() };
    });
  });
}

/**
 * ✅ Converts any ID to safe string
 */
function safeId(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}

/**
 * 📋 Log action
 */
function logAction(action, message) {
  console.log(`${new Date().toISOString()} ${action} → ${message}`);
}

/**
 * ⚠️ Log error
 */
function logError(action, error, uid = null) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (ID: ${uid})` : ""}`);
}
