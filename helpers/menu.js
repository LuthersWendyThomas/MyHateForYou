// 📦 helpers/menu.js | FINAL IMMORTAL v999999999.∞ — SKYLOCKED ADMIN-SAFE SYNCED

import { BOT } from "../config/config.js";
import { MENU_BUTTONS } from "./keyboardConstants.js";

/**
 * ✅ Dinamiškai generuoja vartotojo/admin pagrindinį meniu (tik klaviatūros struktūra)
 * 🔐 Saugus fallback variantas su tik `keyboard` (be reply_markup wrapper)
 * 
 * @param {string|number} id — Telegram vartotojo ID
 * @returns {object} — Telegram klaviatūra (be reply_markup)
 */
export function getMainMenu(id) {
  const uid = String(id || "").trim();
  const adminId = String(BOT?.ADMIN_ID || "").trim();
  const isAdmin = uid === adminId;

  // Dinamiškai kuriamas meniu, atsižvelgiant į administratoriaus statusą
  const menu = [
    [MENU_BUTTONS.BUY, MENU_BUTTONS.HELP],
    [MENU_BUTTONS.PROFILE, MENU_BUTTONS.ORDERS]
  ];

  if (isAdmin) {
    menu.push([MENU_BUTTONS.STATS, MENU_BUTTONS.ADMIN]);
  }

  return {
    // Užtikrina tinkamą grįžtamąją struktūrą be reply_markup
    keyboard: normalizeKeyboard(menu),
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true
  };
}

/**
 * ✅ Klaviatūros normalizavimas - užtikrina saugų ir valdomą formatą.
 * @param {string[][]} keyboard - klaviatūros eilutės
 * @returns {Array<Array<string>>} - normalizuota klaviatūra
 */
function normalizeKeyboard(keyboard) {
  if (!Array.isArray(keyboard)) return [];
  return keyboard.map(row => {
    // Užtikrina, kad visi elementai būtų teisingai suformatuoti kaip string'ai
    if (Array.isArray(row)) return row.map(String);
    return [String(row)];
  });
}
