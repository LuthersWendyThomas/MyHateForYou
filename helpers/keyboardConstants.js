// 📦 helpers/keyboardConstants.js | IMMORTAL FINAL v1.0.1•GODMODE DIAMONDLOCK
// SKYLOCKED SYNC • BULLETPROOF • ULTRA-SAFE • DIAMONDLOCK MAX-PERFECTION

import { BOT } from "../config/config.js";

/**
 * ✅ Centralized button definitions
 */
export const MENU_BUTTONS = {
  BUY:     { text: "🛒 Buy",       callback_data: "MENU_BUY"     },
  PROFILE: { text: "👤 Profile",   callback_data: "MENU_PROFILE" },
  ORDERS:  { text: "📦 Orders",    callback_data: "MENU_ORDERS"  },
  HELP:    { text: "❓ Help",       callback_data: "MENU_HELP"    },
  STATS:   { text: "📊 Stats",      callback_data: "MENU_STATS"   },
  ADMIN:   { text: "🛠 Admin",      callback_data: "MENU_ADMIN"   },
  BACK:    { text: "🔙 Back"                                 },
  CONFIRM: { text: "✅ Confirm"                             },
  CANCEL:  { text: "❌ Cancel"                              },
  YES:     { text: "✅ Yes"                                },
  NO:      { text: "❌ No"                                 }
};

/**
 * ✅ Fallback keyboard for safe reserve
 */
export const MAIN_KEYBOARD = {
  reply_markup: createKeyboard([
    [ MENU_BUTTONS.BUY, MENU_BUTTONS.HELP ],
    [ MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS ],
    [ MENU_BUTTONS.STATS, MENU_BUTTONS.ADMIN ]
  ])
};

/**
 * ✅ Builds the main menu, adding admin buttons if needed
 * @param {string|number} id — Telegram user ID
 * @returns {{ reply_markup: object }}
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
    logAction("getMainMenu", `Generated for ${uid}${isAdmin ? " (admin)" : ""}`);
    return { reply_markup: createKeyboard(rows) };
  } catch (err) {
    logError("getMainMenu", err, uid);
    return MAIN_KEYBOARD;
  }
}

/**
 * ✅ Creates a Telegram keyboard object
 * @param {Array<Array<{ text: string, callback_data?: string }>>} rows
 * @returns {object} — Telegram reply_markup.keyboard
 */
export function createKeyboard(rows) {
  const keyboard = normalizeKeyboard(rows);
  return {
    keyboard,
    resize_keyboard:   true,
    one_time_keyboard: false,
    selective:         false
  };
}

/**
 * ✅ Ensures each row/button is valid and strips extra props
 * @param {Array} keyboard
 * @returns {Array<Array<{ text: string, callback_data?: string }>>}
 */
export function normalizeKeyboard(keyboard) {
  if (!Array.isArray(keyboard)) {
    logError("normalizeKeyboard", new Error("Keyboard must be an array"));
    return [[{ text: "❌ Invalid Keyboard" }]];
  }
  return keyboard.map((row, rIdx) => {
    if (!Array.isArray(row)) {
      logError("normalizeKeyboard", new Error(`Row ${rIdx} not an array`));
      row = [ row ];
    }
    return row.map((btn, cIdx) => {
      if (typeof btn === "string") {
        return { text: btn.trim() };
      }
      if (btn && typeof btn.text === "string") {
        const cleaned = { text: btn.text.trim() };
        if (btn.callback_data) {
          cleaned.callback_data = String(btn.callback_data).trim();
        }
        return cleaned;
      }
      logError("normalizeKeyboard", new Error(`Invalid button at [${rIdx},${cIdx}]`));
      return { text: "❌ Invalid Button" };
    });
  });
}

/**
 * ✅ Fallback single-help keyboard
 * @returns {{ reply_markup: object }}
 */
export function getFallbackKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [ { text: MENU_BUTTONS.HELP.text } ]
      ],
      resize_keyboard:   true,
      one_time_keyboard: false,
      selective:         true
    }
  };
}

// ————— Helpers —————

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
