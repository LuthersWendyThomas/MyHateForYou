// 📦 helpers/keyboardConstants.js | FINAL IMMORTAL v3.1 — DIAMOND SMART+SAFE

import { BOT } from "../config/config.js";

/**
 * ✅ All button labels used across the UI
 */
export const MENU_BUTTONS = {
  START: "🚀 START",
  BUY: "🛒 BUY",
  PROFILE: "👤 PROFILE",
  ORDERS: "📋 MY ORDERS",
  HELP: "❓ HELP",

  // Admin-only
  STATS: "📊 STATISTICS",
  ADMIN: "🔧 ADMIN PANEL"
};

/**
 * ✅ Default static keyboard — legacy fallback
 */
export const MAIN_KEYBOARD = {
  reply_markup: {
    keyboard: [
      [{ text: MENU_BUTTONS.START }],
      [{ text: MENU_BUTTONS.BUY }, { text: MENU_BUTTONS.HELP }],
      [{ text: MENU_BUTTONS.PROFILE }, { text: MENU_BUTTONS.ORDERS }],
      [{ text: MENU_BUTTONS.STATS }, { text: MENU_BUTTONS.ADMIN }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

/**
 * ✅ Generates main menu keyboard — smart admin-aware
 * @param {string|number} id - Telegram user ID
 * @returns {object} Telegram keyboard markup
 */
export function getMainMenu(id) {
  const uid = String(id || "").trim();
  const adminId = String(BOT?.ADMIN_ID || "").trim();

  const isAdmin = uid && adminId && uid === adminId;

  const base = [
    [{ text: MENU_BUTTONS.START }],
    [{ text: MENU_BUTTONS.BUY }, { text: MENU_BUTTONS.HELP }],
    [{ text: MENU_BUTTONS.PROFILE }, { text: MENU_BUTTONS.ORDERS }]
  ];

  if (isAdmin) {
    base.push([
      { text: MENU_BUTTONS.STATS },
      { text: MENU_BUTTONS.ADMIN }
    ]);
  }

  return {
    reply_markup: {
      keyboard: base,
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: true
    }
  };
}
