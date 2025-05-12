// 📦 core/handlers/mainHandler.js | FINAL IMMORTAL v999999999.∞.2
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
import { markUserActive } from "../sessionManager.js";

/**
 * 🔐 Registers the universal Telegram message handler
 */
export function registerMainHandler(bot) {
  if (!bot || typeof bot.on !== "function") {
    console.error("❌ [registerMainHandler] Invalid bot instance.");
    return;
  }

  // 🧠 Handle button interactions via stepHandler
  BOT.INSTANCE.on("callback_query", async (query) => {
    const chatId = query?.message?.chat?.id;
    const data = query?.data;

    if (!chatId || !data) return;

    const uid = String(chatId).trim();
    try {
      markUserActive(uid);
      await handleStep(BOT.INSTANCE, uid, data, userMessages);
      await BOT.INSTANCE.answerCallbackQuery(query.id).catch(() => {});
    } catch (err) {
      console.error("❌ [callback_query] stepHandler error:", err);
      try {
        await BOT.INSTANCE.answerCallbackQuery(query.id, {
          text: "❌ Klaida apdorojant veiksmą.",
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
        case MENU_BUTTONS.BUY:
          return await safeCall(() => startOrder(bot, uid, userMessages));
        case MENU_BUTTONS.PROFILE:
          return await safeCall(() => sendProfile(bot, uid, userMessages));
        case MENU_BUTTONS.ORDERS:
          return await safeCall(() => sendOrders(bot, uid, uid, userMessages));
        case MENU_BUTTONS.HELP:
          return await safeCall(() => sendHelp(bot, uid, userMessages));
        case MENU_BUTTONS.STATS:
          if (isAdmin) return await safeCall(() => sendStats(bot, uid, userMessages));
          break;
        case MENU_BUTTONS.ADMIN:
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
      console.error("❌ [mainHandler crash]:", err.message || err);
      try {
        return await bot.sendMessage(uid, "❗️ Vidinė klaida. Bandykite dar kartą arba naudokite /start.", {
          parse_mode: "Markdown",
          reply_markup: MAIN_KEYBOARD,
        });
      } catch (fallbackErr) {
        console.warn("⚠️ [sendMessage fallback failed]:", fallbackErr.message);
      }
    }
  });
}

/**
 * 🧼 Normalizes user input
 */
function normalizeText(txt) {
  return txt?.toString().trim().slice(0, 4096).toLowerCase();
}

/**
 * 🧯 Safe async execution wrapper
 */
async function safeCall(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("❌ [safeCall error]:", err.message || err);
  }
}
