// 📦 helpers/menu.js | BalticPharma V2 — FINAL IMMORTAL v2025.8 DIAMOND-POLISH ADMIN UX MENU

import { BOT } from "../config/config.js";

/**
 * ✅ Generates the main UX menu for the Telegram bot:
 * 
 * — For User:
 *   • 🛒 BUY
 *   • 👤 PROFILE
 *   • 📋 MY ORDERS
 *   • ❓ HELP
 * 
 * — For Admin Extra:
 *   • 📊 STATISTICS
 *   • 🔧 ADMIN PANEL
 * 
 * @param {number|string} id - Telegram User ID
 * @returns {Object} reply_markup object with buttons
 */
export function getMainMenu(id) {
  const uid = String(id || "").trim();
  const adminId = String(BOT?.ADMIN_ID || "").trim();

  // ✅ Is the user an admin?
  const isAdmin = uid && adminId && uid === adminId;

  // ✅ Basic buttons for everyone
  const userMenu = [
    [{ text: "🛒 BUY" }, { text: "👤 PROFILE" }],
    [{ text: "📋 MY ORDERS" }, { text: "❓ HELP" }]
  ];

  // ✅ Admin accessories
  const adminMenu = [
    [{ text: "📊 STATISTICS" }, { text: "🔧 ADMIN PANEL" }]
  ];

  // ✅ Return to the correct menu
  return {
    keyboard: isAdmin ? [...userMenu, ...adminMenu] : userMenu,
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true
  };
}
