// 📦 helpers/menu.js | IMMORTAL FINAL v1.0.2•9999999999999X•DIAMONDLOCK
// SKYLOCKED BULLETPROOF MENU SYSTEM — ADMIN-SAFE • INLINE-SAFE • VALIDATION-READY

import { BOT } from "../config/config.js";
import { MENU_BUTTONS } from "./keyboardConstants.js";

/**
 * ✅ Safe main menu generator (user/admin-specific)
 * @param {string|number} id — Telegram user ID
 * @returns {{ keyboard, resize_keyboard, one_time_keyboard, selective }}
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
 * ✅ Inline keyboard builder with safety validation
 * @param {Array<Array<{ text: string, callback_data: string }>>} inlineButtons
 * @returns {{ inline_keyboard: Array }}
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

    const validatedRow = row.map((btn, cIdx) => {
      if (
        btn &&
        typeof btn.text === "string" &&
        typeof btn.callback_data === "string"
      ) {
        return {
          text: btn.text.trim(),
          callback_data: btn.callback_data.trim()
        };
      }
      logError("getInlineKeyboard", new Error(`Invalid button at [${r},${cIdx}]`));
      return { text: "❌ Invalid", callback_data: "INVALID" };
    });

    keyboard.push(validatedRow);
  }

  logAction("getInlineKeyboard", `Built inline keyboard`);
  return { inline_keyboard: keyboard };
}

/**
 * ✅ Validates reply_markup.keyboard structure
 * @param {object} keyboard — Telegram reply_markup object
 * @returns {boolean}
 */
export function validateMenuButtons(keyboard) {
  if (!keyboard || !Array.isArray(keyboard.keyboard)) {
    logError("validateMenuButtons", new Error("Invalid keyboard object"));
    return false;
  }

  const isValid = keyboard.keyboard.every(row =>
    Array.isArray(row) && row.every(btn => btn?.text && typeof btn.text === "string")
  );

  if (isValid) logAction("validateMenuButtons", "All buttons valid");
  else logError("validateMenuButtons", new Error("Some buttons are invalid"));

  return isValid;
}

/**
 * ✅ Help-only fallback keyboard (critical error fallback)
 * @returns {{ keyboard, resize_keyboard, one_time_keyboard, selective }}
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

/**
 * ✅ Normalizes keyboard to Telegram-safe format
 * @param {Array<Array<{ text: string }>>} rows
 * @returns {Array<Array<{ text: string }>>}
 */
function normalizeKeyboard(rows) {
  if (!Array.isArray(rows)) {
    logError("normalizeKeyboard", new Error("Rows must be an array"));
    return [];
  }

  return rows.map((row, rIdx) => {
    if (!Array.isArray(row)) {
      logError("normalizeKeyboard", new Error(`Row ${rIdx} not array`));
      return [];
    }

    return row.map((btn, cIdx) => {
      if (btn && typeof btn.text === "string") {
        return { text: btn.text.trim() };
      }
      logError("normalizeKeyboard", new Error(`Invalid button at [${rIdx},${cIdx}]`));
      return { text: "❌ Invalid Button" };
    });
  });
}

// ——— Helpers ———

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logAction(fn, msg) {
  console.log(`${new Date().toISOString()} [${fn}] → ${msg}`);
}

function logError(fn, err, uid = "") {
  const m = err?.message || err;
  console.error(`${new Date().toISOString()} [${fn}] → ${m}${uid ? ` (UID: ${uid})` : ""}`);
}
