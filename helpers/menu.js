// 📦 helpers/menu.js | BalticPharma V2 — FINAL IMMORTAL v2025.8 DIAMOND-POLISH ADMIN UX MENU

import { BOT } from "../config/config.js";

/**
 * ✅ Sugeneruoja pagrindinį UX meniu Telegram botui:
 * 
 * — Vartotojui:
 *   • 🛒 BUY
 *   • 👤 PROFILE
 *   • 📋 MY ORDERS
 *   • ❓ HELP
 * 
 * — Adminui papildomai:
 *   • 📊 STATISTICS
 *   • 🔧 ADMIN PANEL
 * 
 * @param {number|string} id - Telegram vartotojo ID
 * @returns {Object} reply_markup objektas su mygtukais
 */
export function getMainMenu(id) {
  const uid = String(id || "").trim();
  const adminId = String(BOT?.ADMIN_ID || "").trim();

  // ✅ Ar user yra admin
  const isAdmin = uid && adminId && uid === adminId;

  // ✅ Pagrindiniai mygtukai visiems
  const userMenu = [
    [{ text: "🛒 BUY" }, { text: "👤 PROFILE" }],
    [{ text: "📋 MY ORDERS" }, { text: "❓ HELP" }]
  ];

  // ✅ Admin priedai
  const adminMenu = [
    [{ text: "📊 STATISTICS" }, { text: "🔧 ADMIN PANEL" }]
  ];

  // ✅ Return teisingą meniu
  return {
    keyboard: isAdmin ? [...userMenu, ...adminMenu] : userMenu,
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true
  };
}
