// 📦 core/handlers/mainHandler.js | FIXED AND FINALIZED
// GODMODE LOCKED • ADMIN SYNC • BUTTON FUNCTIONALITY SECURED

import { BOT } from "../../config/config.js";
import { userSessions, userMessages } from "../../state/userState.js";
import { safeStart } from "./finalHandler.js";
import { handleStep } from "./stepHandler.js";
import { startOrder } from "../../flows/startOrder.js";
import { sendHelp } from "../../utils/sendHelp.js";
import { sendStats } from "../../utils/sendStats.js";
import { sendOrders } from "../../utils/sendOrders.js";
import { sendProfile } from "../../utils/sendProfile.js";
import { openAdminPanel, handleAdminAction } from "../../utils/adminPanel.js";
import { MENU_BUTTONS, MAIN_KEYBOARD } from "../../helpers/keyboardConstants.js";
import { getMainMenu } from "../../helpers/menu.js";
import { markUserActive } from "../sessionManager.js";

/**
 * 🔐 Registers the universal Telegram message handler
 */
export function registerMainHandler(bot) {
  if (!bot || typeof bot.on !== "function") {
    console.error("❌ [registerMainHandler] Invalid bot instance.");
    return;
  }

  // 🧠 Handle button interactions via callback_query
  bot.on("callback_query", async (query) => {
    const chatId = query?.message?.chat?.id;
    const callbackData = query?.data;

    if (!chatId || !callbackData) return;

    const uid = String(chatId).trim();
    try {
      markUserActive(uid);

      // Log callback data for debugging
      console.log(`📥 [callback_query] UID: ${uid}, Data: ${callbackData}`);

      // Route callback data to specific handlers
      switch (callbackData) {
        case MENU_BUTTONS.BUY.callback_data:
          return await safeCall(() => startOrder(bot, uid, userMessages));
        case MENU_BUTTONS.PROFILE.callback_data:
          return await safeCall(() => sendProfile(bot, uid, userMessages));
        case MENU_BUTTONS.ORDERS.callback_data:
          return await safeCall(() => sendOrders(bot, uid, userMessages));
        case MENU_BUTTONS.HELP.callback_data:
          return await safeCall(() => sendHelp(bot, uid, userMessages));
        case MENU_BUTTONS.STATS.callback_data:
          if (uid === String(BOT.ADMIN_ID)) {
            return await safeCall(() => sendStats(bot, uid, userMessages));
          }
          break;
        case MENU_BUTTONS.ADMIN.callback_data:
          if (uid === String(BOT.ADMIN_ID)) {
            return await safeCall(() => openAdminPanel(bot, uid));
          }
          break;
        default:
          console.warn(`⚠️ Unhandled callback data: ${callbackData}`);
          return await bot.answerCallbackQuery(query.id, {
            text: "❌ Invalid action. Use the buttons.",
            show_alert: true,
          });
      }

      // Acknowledge the callback query
      await bot.answerCallbackQuery(query.id).catch(() => {});
    } catch (err) {
      console.error("❌ [callback_query error]:", err.message || err);
    }
  });

  // 🧠 Handle incoming messages
  bot.on("message", async (msg) => {
    const chatId = msg?.chat?.id;
    const text = normalizeText(msg?.text);

    if (!chatId || !text) return;

    const uid = String(chatId).trim();
    try {
      markUserActive(uid);

      const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
      session.lastText = text;

      // Log incoming message for debugging
      console.log(`📩 [message] UID: ${uid}, Text: ${text}`);

      const isAdmin = uid === String(BOT.ADMIN_ID);

      // /start command resets session
      if (text === "/start") {
        console.log(`🚀 /start from ${uid}`);
        return await safeCall(() => safeStart(bot, uid));
      }

      // Admin actions
      if (session.adminStep) {
        return await safeCall(() => handleAdminAction(bot, msg, userSessions));
      }

      // Static routes
      switch (text) {
        case MENU_BUTTONS.BUY.text.toLowerCase():
          return await safeCall(() => startOrder(bot, uid, userMessages));
        case MENU_BUTTONS.PROFILE.text.toLowerCase():
          return await safeCall(() => sendProfile(bot, uid, userMessages));
        case MENU_BUTTONS.ORDERS.text.toLowerCase():
          return await safeCall(() => sendOrders(bot, uid, userMessages));
        case MENU_BUTTONS.HELP.text.toLowerCase():
          return await safeCall(() => sendHelp(bot, uid, userMessages));
        case MENU_BUTTONS.STATS.text.toLowerCase():
          if (isAdmin) return await safeCall(() => sendStats(bot, uid, userMessages));
          break;
        case MENU_BUTTONS.ADMIN.text.toLowerCase():
          if (isAdmin) return await safeCall(() => openAdminPanel(bot, uid));
          break;
      }

      // Fallback for invalid actions
      await bot.sendMessage(uid, "❌ Invalid action. Use the buttons below:", {
        reply_markup: getMainMenu(uid),
      });
    } catch (err) {
      console.error("❌ [mainHandler error]:", err.message || err);
    }
  });
}

/**
 * Normalize user input text
 */
function normalizeText(txt) {
  return txt?.toString().trim().toLowerCase();
}

/**
 * Safe async execution wrapper
 */
async function safeCall(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("❌ [safeCall error]:", err.message || err);
  }
}
