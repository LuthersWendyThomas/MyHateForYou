// 📦 helpers/menu.js | FINAL IMMORTAL v3.1 — SYNC-POLISHED ADMIN UX EDITION

import { BOT } from "../config/config.js";
import { MENU_BUTTONS } from "./keyboardConstants.js";

/**
 * ✅ Smart dynamic keyboard generator
 * Matches config + keyboardConstants.js for 100% compatibility
 * 
 * @param {string|number} id - Telegram User ID
 * @returns {object} Telegram-compatible keyboard markup
 */
export function getMainMenu(id) {
  const uid = String(id || "").trim();
  const adminId = String(BOT?.ADMIN_ID || "").trim();
  const isAdmin = uid && adminId && uid === adminId;

  const keyboard = [
    [{ text: MENU_BUTTONS.START }],
    [{ text: MENU_BUTTONS.BUY }, { text: MENU_BUTTONS.HELP }],
    [{ text: MENU_BUTTONS.PROFILE }, { text: MENU_BUTTONS.ORDERS }]
  ];

  if (isAdmin) {
    keyboard.push([
      { text: MENU_BUTTONS.STATS },
      { text: MENU_BUTTONS.ADMIN }
    ]);
  }

  return {
    keyboard,
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true
  };
}
