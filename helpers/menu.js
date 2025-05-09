// 📦 helpers/menu.js | FINAL IMMORTAL v9999999 — SKYLOCKED ADMIN-SAFE SYNC

import { BOT } from "../config/config.js";
import { MENU_BUTTONS } from "./keyboardConstants.js";

/**
 * ✅ Smart dynamic keyboard (admin-aware)
 * 100% synchronized with all menu expectations across handlers
 *
 * @param {string|number} id - Telegram user ID
 * @returns {object} Telegram keyboard markup
 */
export function getMainMenu(id) {
  const uid = String(id || "").trim();
  const adminId = String(BOT?.ADMIN_ID || "").trim();
  const isAdmin = uid && adminId && uid === adminId;

  const baseKeyboard = [
    [{ text: MENU_BUTTONS.START }],
    [{ text: MENU_BUTTONS.BUY }, { text: MENU_BUTTONS.HELP }],
    [{ text: MENU_BUTTONS.PROFILE }, { text: MENU_BUTTONS.ORDERS }]
  ];

  if (isAdmin) {
    baseKeyboard.push([
      { text: MENU_BUTTONS.STATS },
      { text: MENU_BUTTONS.ADMIN }
    ]);
  }

  return {
    keyboard: baseKeyboard,
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true
  };
}
