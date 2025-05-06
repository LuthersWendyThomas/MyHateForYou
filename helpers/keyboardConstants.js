// 📦 helpers/keyboardConstants.js | BalticPharma V2 — FINAL IMMORTAL v2025.9 LEGACY-COMPAT MAIN_KEYBOARD RESTORE

/**
 * ✅ Texts for all menu buttons
 */
export const MENU_BUTTONS = {
  START: "🚀 START",
  BUY: "🛒 BUY",
  PROFILE: "👤 PROFILE",
  ORDERS: "📋 MY ORDERS",
  HELP: "❓ HELP",

  // Admin only
  STATS: "📊 STATISTICS",
  ADMIN: "🔧 ADMIN PANEL"
};

/**
 * ✅ Main menu for everyone (used everywhere — kept for compatibility)
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
