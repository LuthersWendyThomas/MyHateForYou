// 📦 helpers/keyboardConstants.js | IMMORTAL FINAL v9999999999 — SYNCED BULLETPROOF DIAMONDLOCK

import { BOT } from "../config/config.js";

/**
 * ✅ Centralized button labels for all flows
 */
export const MENU_BUTTONS = {
  START: "🚀 START",
  BUY: "🛒 BUY",
  PROFILE: "👤 PROFILE",
  ORDERS: "📋 MY ORDERS",
  HELP: "❓ HELP",

  // Admin zone
  STATS: "📊 STATISTICS",
  ADMIN: "🔧 ADMIN PANEL"
};

/**
 * ✅ Legacy fallback keyboard (used as last resort)
 */
export const MAIN_KEYBOARD = {
  reply_markup: {
    keyboard: [
      [{ text: MENU_BUTTONS.BUY }, { text: MENU_BUTTONS.HELP }],
      [{ text: MENU_BUTTONS.PROFILE }, { text: MENU_BUTTONS.ORDERS }],
      [{ text: MENU_BUTTONS.STATS }, { text: MENU_BUTTONS.ADMIN }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true
  }
};

/**
 * ✅ Builds smart user/admin keyboard on runtime
 * @param {string|number} id — Telegram user ID
 * @returns {object} Fully structured Telegram keyboard
 */
export function getMainMenu(id) {
  const uid = String(id || "").trim();
  const adminId = String(BOT?.ADMIN_ID || "").trim();
  const isAdmin = uid && adminId && uid === adminId;

  const rows = [
    [{ text: MENU_BUTTONS.BUY }, { text: MENU_BUTTONS.HELP }],
    [{ text: MENU_BUTTONS.PROFILE }, { text: MENU_BUTTONS.ORDERS }]
  ];

  if (isAdmin) {
    rows.push([{ text: MENU_BUTTONS.STATS }, { text: MENU_BUTTONS.ADMIN }]);
  }

  return {
    reply_markup: {
      keyboard: rows,
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: true
    }
  };
}
