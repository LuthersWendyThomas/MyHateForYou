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
  BACK: { text: "🔙 Back" },
  CONFIRM: { text: "✅ Confirm" },
  CANCEL: { text: "❌ Cancel" },
  YES: { text: "✅ Yes" },
  NO: { text: "❌ No" }
};

/**
 * ✅ Fallback keyboard — used as a safe reserve (when others fail)
 */
export const MAIN_KEYBOARD = createKeyboard([
  [MENU_BUTTONS.BUY, MENU_BUTTONS.HELP],
  [MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS],
  [MENU_BUTTONS.STATS, MENU_BUTTONS.ADMIN]
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
      [MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS]
    ];

    if (isAdmin) {
      rows.push([MENU_BUTTONS.STATS, MENU_BUTTONS.ADMIN]);
    }

    const keyboard = createKeyboard(rows);
    logAction("✅ [getMainMenu]", `Generated keyboard → ${uid}${isAdmin ? " (admin)" : ""}`);
    return { reply_markup: keyboard };
  } catch (err) {
    logError("❌ [getMainMenu error]", err, uid);
    return MAIN_KEYBOARD;
  }
}

/**
 * ✅ Creates a Telegram keyboard with safe formatting
 * @param {Array<Array<{ text: string, callback_data?: string }>>} rows — Button rows
 * @returns {object} Telegram reply_markup object
 */
export function createKeyboard(rows) {
  const normalizedKeyboard = normalizeKeyboard(rows);
  return {
    keyboard: normalizedKeyboard,
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: false
  };
}

/**
 * ✅ Keyboard normalizer — guarantees safe formatting
 * @param {Array<Array<{ text: string, callback_data?: string }>>} keyboard
 * @returns {Array<Array<{ text: string }>>}
 */
export function normalizeKeyboard(keyboard) {
  if (!Array.isArray(keyboard)) {
    logError("⚠️ [normalizeKeyboard]", new Error("Invalid keyboard structure"));
    return [[{ text: "❌ Invalid Keyboard" }]];
  }

  return keyboard.map(row => {
    if (!Array.isArray(row)) return [{ text: String(row || "").trim() }];
    return row.map(btn => {
      if (!btn?.text) {
        logError("⚠️ [normalizeKeyboard]", new Error("Missing 'text' on button"));
        return { text: "❌ Invalid Button" };
      }
      return { text: String(btn.text).trim() };
    });
  });
}

/**
 * ✅ Returns fallback keyboard
 */
export function getFallbackKeyboard() {
  return {
    keyboard: [[{ text: MENU_BUTTONS.HELP.text }]],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true
  };
}

/**
 * ✅ ID sanitizer
 */
function safeId(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}

/**
 * 📝 Logger (success)
 */
function logAction(action, message) {
  console.log(`${new Date().toISOString()} ${action} → ${message}`);
}

/**
 * ⚠️ Logger (error)
 */
function logError(action, error, uid = null) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (ID: ${uid})` : ""}`);
}
