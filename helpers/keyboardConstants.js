// 📦 helpers/keyboardConstants.js | FINAL IMMORTAL v3.0 — SMART-MODE LEGACY+COMPAT

/**
 * ✅ All button labels (used across UI)
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
 * ✅ Default keyboard (legacy version for compatibility)
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
 * ✅ Smart keyboard generator — filters buttons by role
 */
export function getMainMenu(id) {
  const isAdmin =
    process.env.BOT_ADMIN_ID &&
    String(id) === String(process.env.BOT_ADMIN_ID);

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
    reply_markup: {
      keyboard,
      resize_keyboard: true,
      one_time_keyboard: false
    }
  };
}
