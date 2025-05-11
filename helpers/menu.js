// 📦 helpers/menu.js | FINAL IMMORTAL v999999999.∞ — SKYLOCKED ADMIN-SAFE SYNCED

import { BOT } from "../config/config.js";
import { MENU_BUTTONS } from "./keyboardConstants.js";

/**
 * ✅ Dynamically builds user/admin menu (keyboard only)
 * 🔐 Safe fallback variant with only `keyboard` (no reply_markup wrapper)
 *
 * @param {string|number} id — Telegram user ID
 * @returns {object} — Telegram keyboard (not wrapped in reply_markup)
 */
export function getMainMenu(id) {
  const uid = String(id || "").trim();
  const adminId = String(BOT?.ADMIN_ID || "").trim();
  const isAdmin = uid === adminId;

  const menu = [
    [{ text: MENU_BUTTONS.BUY }, { text: MENU_BUTTONS.HELP }],
    [{ text: MENU_BUTTONS.PROFILE }, { text: MENU_BUTTONS.ORDERS }]
  ];

  if (isAdmin) {
    menu.push([{ text: MENU_BUTTONS.STATS }, { text: MENU_BUTTONS.ADMIN }]);
  }

  return {
    keyboard: menu,
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true
  };
}
