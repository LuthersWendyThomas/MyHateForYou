// 📦 core/handlers/mainHandler.js | IMMORTAL FINAL v999999999∞+GODMODE
// SYNCED • SECURED • TEXTLESS FSM • BULLETPROOF CALLBACKS • ADMIN LOCKED • 24/7 FSM GATEWAY

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
import { canProceed } from "../security.js";

/**
 * 🔐 Registers Telegram message & callback handlers
 */
export function registerMainHandler(bot) {
  if (!bot?.on) {
    console.error("❌ [mainHandler] Invalid bot instance");
    return;
  }

  // 🎯 Handle CALLBACK QUERIES (button clicks)
  bot.on("callback_query", async (query) => {
    const chatId = query?.message?.chat?.id;
    const callbackData = query?.data;
    if (!chatId || !callbackData) return;

    const uid = String(chatId).trim();
    try {
      markUserActive(uid);
      if (!(await canProceed(uid, bot))) return;

      console.log(`📥 [callback_query] ${uid}: ${callbackData}`);

      // Admin-only routes
      if (callbackData === MENU_BUTTONS.STATS.callback_data && isAdmin(uid)) {
        return await safeCall(() => sendStats(bot, uid, userMessages), uid);
      }
      if (callbackData === MENU_BUTTONS.ADMIN.callback_data && isAdmin(uid)) {
        return await safeCall(() => openAdminPanel(bot, uid), uid);
      }

      // Public routes
      switch (callbackData) {
        case MENU_BUTTONS.BUY.callback_data:
          return await safeCall(() => startOrder(bot, uid, userMessages), uid);
        case MENU_BUTTONS.PROFILE.callback_data:
          return await safeCall(() => sendProfile(bot, uid, userMessages), uid);
        case MENU_BUTTONS.ORDERS.callback_data:
          return await safeCall(() => sendOrders(bot, uid, userMessages), uid);
        case MENU_BUTTONS.HELP.callback_data:
          return await safeCall(() => sendHelp(bot, uid, userMessages), uid);
        default:
          console.warn(`⚠️ Unknown callback: ${callbackData}`);
          return await bot.answerCallbackQuery(query.id, {
            text: "❌ Invalid button.",
            show_alert: true
          });
      }
    } catch (err) {
      console.error("❌ [callback_query error]:", err.message || err);
    } finally {
      await bot.answerCallbackQuery(query.id).catch(() => {});
    }
  });

  // 💬 Handle MESSAGES (user input)
  bot.on("message", async (msg) => {
    const chatId = msg?.chat?.id;
    const text = normalizeText(msg?.text);
    if (!chatId || !text) return;

    const uid = String(chatId).trim();
    try {
      markUserActive(uid);
      if (!(await canProceed(uid, bot, text))) return;

      const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
      session.lastText = text;

      console.log(`📩 [message] ${uid}: ${text}`);

      if (text === "/start") {
        console.log(`🚀 ${uid} triggered /start`);
        return await safeCall(() => safeStart(bot, uid), uid);
      }

      if (session.adminStep) {
        return await safeCall(() => handleAdminAction(bot, msg, userSessions), uid);
      }

      // Match static menu buttons
      if (isTextButtonMatch(text, MENU_BUTTONS.BUY)) {
        return await safeCall(() => startOrder(bot, uid, userMessages), uid);
      }
      if (isTextButtonMatch(text, MENU_BUTTONS.PROFILE)) {
        return await safeCall(() => sendProfile(bot, uid, userMessages), uid);
      }
      if (isTextButtonMatch(text, MENU_BUTTONS.ORDERS)) {
        return await safeCall(() => sendOrders(bot, uid, userMessages), uid);
      }
      if (isTextButtonMatch(text, MENU_BUTTONS.HELP)) {
        return await safeCall(() => sendHelp(bot, uid, userMessages), uid);
      }
      if (isTextButtonMatch(text, MENU_BUTTONS.STATS) && isAdmin(uid)) {
        return await safeCall(() => sendStats(bot, uid, userMessages), uid);
      }
      if (isTextButtonMatch(text, MENU_BUTTONS.ADMIN) && isAdmin(uid)) {
        return await safeCall(() => openAdminPanel(bot, uid), uid);
      }

      // Dynamic FSM flow
      return await safeCall(() => handleStep(bot, uid, text, userMessages), uid);
    } catch (err) {
      console.error("❌ [message error]:", err.message || err);
    }
  });
}

/**
 * 🧼 Normalize user input text
 */
function normalizeText(txt) {
  return txt?.toString().trim().toLowerCase();
}

/**
 * 🧠 Compare normalized text to button
 */
function isTextButtonMatch(text, button) {
  return normalizeText(button?.text) === text;
}

/**
 * 🛡️ Is user an admin?
 */
function isAdmin(id) {
  return String(id) === String(BOT.ADMIN_ID);
}

/**
 * ✅ Wrap async call with error logging
 */
async function safeCall(fn, uid = "unknown") {
  try {
    return await fn();
  } catch (err) {
    console.error(`❌ [safeCall uid=${uid}]:`, err.message || err);
  }
}
