// 📦 helpers/menu.js | FINAL IMMORTAL v1.0.0•GODMODE DIAMONDLOCK
// SKYLOCKED ADMIN-SAFE BULLETPROOF MENU SYSTEM — MAX BUTTON VALIDATION + INLINE + FALLBACK

import { BOT } from "../config/config.js";
import { MENU_BUTTONS } from "./keyboardConstants.js";

/**
 * ✅ Generates the main menu keyboard for users/admins
 * @param {string|number} id — Telegram user ID
 * @returns {{ keyboard: Array<Array<{ text: string }>>, resize_keyboard: boolean, one_time_keyboard: boolean, selective: boolean }}
 */
export function getMainMenu(id) {
  const uid     = sanitizeId(id);
  const isAdmin = uid && String(uid) === String(BOT.ADMIN_ID);

  try {
    const rows = [
      [ MENU_BUTTONS.BUY,     MENU_BUTTONS.HELP    ],
      [ MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS  ]
    ];
    if (isAdmin) {
      rows.push([ MENU_BUTTONS.STATS, MENU_BUTTONS.ADMIN ]);
    }

    const keyboard = normalizeKeyboard(rows);
    logAction("getMainMenu", `Generated for ${uid}${isAdmin ? " (admin)" : ""}`);
    return {
      keyboard,
      resize_keyboard:   true,
      one_time_keyboard: false,
      selective:         true
    };
  } catch (err) {
    logError("getMainMenu", err, uid);
    return getFallbackKeyboard();
  }
}

/**
 * ✅ Generates an inline keyboard from validated button rows
 * @param {Array<Array<{ text: string, callback_data: string }>>} inlineButtons
 * @returns {{ inline_keyboard: Array<Array<{ text: string, callback_data: string }>> }}
 */
export function getInlineKeyboard(inlineButtons) {
  const keyboard = [];

  if (!Array.isArray(inlineButtons)) {
    logError("getInlineKeyboard", new Error("Inline buttons must be an array"));
    return { inline_keyboard: [] };
  }

  for (let r = 0; r < inlineButtons.length; r++) {
    const row = inlineButtons[r];
    if (!Array.isArray(row)) {
      logError("getInlineKeyboard", new Error(`Row ${r} is not an array`));
      continue;
    }
    const validatedRow = [];
    for (let c = 0; c < row.length; c++) {
      const btn = row[c];
      if (btn && typeof btn.text === "string" && typeof btn.callback_data === "string") {
        validatedRow.push({
          text: btn.text.trim(),
          callback_data: btn.callback_data.trim()
        });
      } else {
        logError(
          "getInlineKeyboard",
          new Error(`Invalid button at [${r},${c}]`)
        );
        validatedRow.push({ text: "❌ Invalid", callback_data: "INVALID" });
      }
    }
    keyboard.push(validatedRow);
  }

  logAction("getInlineKeyboard", `Built inline keyboard`);
  return { inline_keyboard: keyboard };
}

/**
 * ✅ Validates a standard reply keyboard structure
 * @param {object} keyboard — The reply_markup object
 * @returns {boolean}
 */
export function validateMenuButtons(keyboard) {
  if (
    !keyboard ||
    !Array.isArray(keyboard.keyboard) ||
    keyboard.keyboard.length === 0
  ) {
    logError("validateMenuButtons", new Error("Invalid keyboard object"));
    return false;
  }

  const allValid = keyboard.keyboard.every(row =>
    Array.isArray(row) &&
    row.every(btn => btn?.text && typeof btn.text === "string")
  );

  if (allValid) {
    logAction("validateMenuButtons", "All buttons valid");
  } else {
    logError("validateMenuButtons", new Error("Some buttons are invalid"));
  }
  return allValid;
}

/**
 * ✅ Fallback for when menu generation fails
 * @returns {{ keyboard: Array<Array<{ text: string }>>, resize_keyboard: boolean, one_time_keyboard: boolean, selective: boolean }}
 */
export function getFallbackKeyboard() {
  const kb = {
    keyboard: [ [ { text: MENU_BUTTONS.HELP.text } ] ],
    resize_keyboard:   true,
    one_time_keyboard: false,
    selective:         true
  };
  logAction("getFallbackKeyboard", `Returned fallback keyboard`);
  return kb;
}

// ————— INTERNAL HELPERS —————

/**
 * 🔒 Sanitizes any ID into a non-empty string or returns null
 */
function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

/**
 * ✅ Normalizes button rows into { text } objects
 * @param {Array<Array<{ text: string, callback_data?: string }>>} rows
 * @returns {Array<Array<{ text: string }>>}
 */
function normalizeKeyboard(rows) {
  if (!Array.isArray(rows)) {
    logError("normalizeKeyboard", new Error("Rows must be an array"));
    return [];
  }
  return rows.map((row, rIdx) => {
    if (!Array.isArray(row)) {
      logError("normalizeKeyboard", new Error(`Row ${rIdx} not an array`));
      return [];
    }
    return row.map((btn, cIdx) => {
      if (btn && typeof btn.text === "string") {
        return { text: btn.text.trim() };
      }
      logError(
        "normalizeKeyboard",
        new Error(`Invalid button at [${rIdx},${cIdx}]`)
      );
      return { text: "❌ Invalid Button" };
    });
  });
}

/**
 * 📋 Logs actions uniformly
 */
function logAction(fn, message) {
  console.log(`${new Date().toISOString()} [${fn}] → ${message}`);
}

/**
 * ⚠️ Logs errors uniformly
 */
function logError(fn, error, uid = "") {
  const msg = error?.message || error;
  console.error(`${new Date().toISOString()} [${fn}] → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}
