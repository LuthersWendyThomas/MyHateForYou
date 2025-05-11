// 📦 core/handlers/mainHandler.js | FINAL IMMORTAL v999999999.∞
// FULL SYNC W/ ADMINPANEL • DISCOUNT CONTROL • ERROR SAFE • SESSION LOCKED

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

  bot.on("message", async (msg) => {
    const id = msg?.chat?.id;
    let text = msg?.text;

    if (!id || typeof text !== "string") return;

    const uid = String(id).trim();
    text = normalizeText(text);
    if (!text) return;

    try {
      markUserActive(uid);

      const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
      session.lastText = text;

      const isAdmin = uid === String(BOT.ADMIN_ID);

      // ✅ Security check
      const allowed = await canProceed(uid, bot, text);
      if (!allowed) return;

      // ✅ Force /start reset
      if (text === "/start") {
        console.log(`🚀 /start command from ${uid}`);
        return await safeCall(() => safeStart(bot, uid));
      }

      // ✅ Admin flow step handling
      if (session.adminStep) {
        return await safeCall(() => handleAdminAction(bot, msg, userSessions));
      }

      // ✅ Static routing
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

      // ✅ Step-based session routing
      const step = Number(session.step);
      if (!Number.isInteger(step) || step < 1 || step > 9) {
        console.warn(`⚠️ Corrupt step "${session.step}" → Resetting session for ${uid}`);
        session.step = 1;
      }

      return await safeCall(() => handleStep(bot, uid, text, userMessages));
    } catch (err) {
      console.error("❌ [MainHandler crash]:", err.message || err);
      try {
        return await bot.sendMessage(uid, "❗️ Internal error.\nTry again or type /start.", {
          parse_mode: "Markdown",
          reply_markup: MAIN_KEYBOARD
        });
      } catch (fallbackErr) {
        console.warn("⚠️ [Fallback send failed]:", fallbackErr.message);
      }
    }
  });
}

/**
 * 🧼 Normalizes text input
 */
function normalizeText(txt) {
  return txt?.toString().trim().slice(0, 4096).toLowerCase();
}

/**
 * 🔐 Safe async call
 */
async function safeCall(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("❌ [safeCall error]:", err.message || err);
  }
}
