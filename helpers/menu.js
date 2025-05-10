// 📦 helpers/menu.js | FINAL IMMORTAL v9999999 — SKYLOCKED ADMIN-SAFE SYNCED (NO START)

import { BOT } from "../config/config.js";
import { MENU_BUTTONS } from "./keyboardConstants.js";

/**
 * ✅ Dynamically builds main menu based on admin status
 * 🔐 Synchronized with handlers & keyboard logic (no START button!)
 *
 * @param {string|number} id — Telegram user ID
 * @returns {object} Telegram keyboard reply_markup
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
    menu.push([
      { text: MENU_BUTTONS.STATS },
      { text: MENU_BUTTONS.ADMIN }
    ]);
  }

  return {
    keyboard: menu,
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true
  };
}
