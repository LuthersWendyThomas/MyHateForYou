// 📦 helpers/keyboardConstants.js | FINAL IMMORTAL v999999999999.∞ — SYNC-GODMODE DIAMONDLOCK MAX-PERFECTION

import { BOT } from "../config/config.js";

/**
 * ✅ Centralizuoti mygtukų pavadinimai (vartotojams ir adminams)
 */
export const MENU_BUTTONS = {
  START: "🚀 START",
  BUY: "🛒 BUY",
  PROFILE: "👤 PROFILE",
  ORDERS: "📋 MY ORDERS",
  HELP: "❓ HELP",

  // Admin skiltis
  STATS: "📊 STATISTICS",
  ADMIN: "🔧 ADMIN PANEL"
};

/**
 * ✅ Fallback klaviatūra — naudojama kaip saugus rezervas (kai kiti nepavyksta)
 */
export const MAIN_KEYBOARD = {
  reply_markup: {
    keyboard: normalizeKeyboard([
      [MENU_BUTTONS.BUY, MENU_BUTTONS.HELP],
      [MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS],
      [MENU_BUTTONS.STATS, MENU_BUTTONS.ADMIN]
    ]),
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: false
  }
};

/**
 * ✅ Dinaminė pagrindinio meniu generacija (admin saugi)
 * @param {string|number} id — Telegram vartotojo ID
 * @returns {object} Telegram klaviatūra (reply_markup)
 */
export function getMainMenu(id) {
  const uid = String(id || "").trim();
  const adminId = String(BOT?.ADMIN_ID || "").trim();
  const isAdmin = uid === adminId;

  const rows = [
    [MENU_BUTTONS.BUY, MENU_BUTTONS.HELP],
    [MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS]
  ];

  if (isAdmin) {
    rows.push([MENU_BUTTONS.STATS, MENU_BUTTONS.ADMIN]);
  }

  return {
    reply_markup: {
      keyboard: normalizeKeyboard(rows),
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: false
    }
  };
}

/**
 * ✅ Klaviatūros normalizatorius — garantuoja saugų formatą
 * @param {string[][]} keyboard
 * @returns {Array<Array<string>>}
 */
function normalizeKeyboard(keyboard) {
  if (!Array.isArray(keyboard)) return [];
  return keyboard.map(row => {
    if (Array.isArray(row)) return row.map(String);
    return [String(row)];
  });
}
