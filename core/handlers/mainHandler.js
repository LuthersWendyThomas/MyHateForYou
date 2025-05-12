// 📦 core/handlers/mainHandler.js | FINAL IMMORTAL v999999999.∞+ULTIMATE
// GODMODE LOCKED • ADMIN SYNC • DISCOUNT SECURED • CALLBACK FIXED • SESSION IMMORTAL

import { BOT } from "../../config/config.js";
import { userSessions, userMessages, userOrders } from "../../state/userState.js";
import { safeStart } from "./finalHandler.js";
import { handleStep } from "./stepHandler.js";
import { startOrder } from "../../flows/startOrder.js";
import { sendHelp } from "../../utils/sendHelp.js";
import { sendStats } from "../../utils/sendStats.js";
import { sendOrders } from "../../utils/sendOrders.js";
import { sendProfile } from "../../utils/sendProfile.js";
import { openAdminPanel, handleAdminAction } from "../../utils/adminPanel.js";
import { canProceed } from "../security.js";
import { MENU_BUTTONS, MAIN_KEYBOARD } from "../../helpers/keyboardConstants.js";
import { getMainMenu } from "../../helpers/menu.js"; // NEW IMPORT
import { markUserActive } from "../sessionManager.js";

/**
 * 🔐 Registers the universal Telegram message handler
 * Ensures all button interactions and incoming messages are handled seamlessly
 */
export function registerMainHandler(bot) {
  if (!bot || typeof bot.on !== "function") {
    console.error("❌ [registerMainHandler] Invalid bot instance.");
    return;
  }

  // 🧠 Handle button interactions via stepHandler
  bot.on("callback_query", async (query) => {
    const chatId = query?.message?.chat?.id;
    const callbackData = query?.data;

    if (!chatId || !callbackData) return;

    const uid = String(chatId).trim();
    try {
      markUserActive(uid);

      // Log the callback data for debugging
      console.log(`📥 [callback_query] UID: ${uid}, Data: ${callbackData}`);

      // Route the callback data to the step handler
      await handleStep(bot, uid, callbackData, userMessages);

      // Acknowledge the callback query
      await bot.answerCallbackQuery(query.id).catch(() => {});
    } catch (err) {
      console.error("❌ [callback_query error]:", err);
      try {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Error processing your action. Please try again.",
          show_alert: true,
        });
      } catch (callbackErr) {
        console.warn("⚠️ Failed to answer callback query:", callbackErr.message);
      }
    }
  });

  // 🧠 Handle incoming messages
  bot.on("message", async (msg) => {
    const chatId = msg?.chat?.id;
    let text = msg?.text;

    if (!chatId || typeof text !== "string") return;

    const uid = String(chatId).trim();
    text = normalizeText(text);
    if (!text) return;

    try {
      markUserActive(uid);

      const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
      session.lastText = text;

      const isAdmin = uid === String(BOT.ADMIN_ID);

      // 🔐 Security check
      const allowed = await canProceed(uid, bot, text);
      if (!allowed) return;

      // ♻️ /start command resets session
      if (text === "/start") {
        console.log(`🚀 /start from ${uid}`);
        return await safeCall(() => safeStart(bot, uid));
      }

      // 🛠 Admin actions
      if (session.adminStep) {
        return await safeCall(() => handleAdminAction(bot, msg, userSessions));
      }

      // 📦 Static routes
      switch (text) {
        case MENU_BUTTONS.BUY.text:
          return await safeCall(() => startOrder(bot, uid, userMessages));
        case MENU_BUTTONS.PROFILE.text:
          return await safeCall(() => sendProfile(bot, uid, userMessages));
        case MENU_BUTTONS.ORDERS.text:
          return await safeCall(() => sendOrders(bot, uid, uid, userMessages));
        case MENU_BUTTONS.HELP.text:
          return await safeCall(() => sendHelp(bot, uid, userMessages));
        case MENU_BUTTONS.STATS.text:
          if (isAdmin) return await safeCall(() => sendStats(bot, uid, userMessages));
          break;
        case MENU_BUTTONS.ADMIN.text:
          if (isAdmin) return await safeCall(() => openAdminPanel(bot, uid));
          break;
      }

      // 🧠 Step-based session routing
      const step = Number(session.step);
      if (!Number.isInteger(step) || step < 1 || step > 9) {
        console.warn(`⚠️ Corrupt step "${session.step}" → resetting ${uid}`);
        session.step = 1;
      }

      return await safeCall(() => handleStep(bot, uid, text, userMessages));
    } catch (err) {
      console.error("❌ [mainHandler error]:", err.message || err);
      try {
        // Fallback to main menu on error
        const mainMenu = getMainMenu(uid);
        return await bot.sendMessage(uid, "❗️ Internal error. Please try again or use /start.", {
          parse_mode: "Markdown",
          reply_markup: mainMenu,
        });
      } catch (fallbackErr) {
        console.warn("⚠️ [sendMessage fallback failed]:", fallbackErr.message);
      }
    }
  });
}

/**
 * 🧼 Normalizes user input by trimming and limiting length
 * @param {string} txt - Raw user input
 * @returns {string} - Normalized text
 */
function normalizeText(txt) {
  return txt?.toString().trim().slice(0, 4096).toLowerCase();
}

/**
 * 🧯 Safe async execution wrapper
 * @param {function} fn - Async function to execute safely
 * @returns {Promise<any>} - Result of the async function or undefined
 */
async function safeCall(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("❌ [safeCall error]:", err.message || err);
  }
}
