// 📦 core/handlers/mainHandler.js | IMMORTAL FINAL v9999999999999.∞
// FULLY LOCKED DEPLOY GODMODE + ADMIN + FLOW + FALLBACK + SECURE SYNC

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
  bot.on("message", async (msg) => {
    const id = msg.chat?.id;
    let text = msg.text;

    if (!bot || !id || typeof text !== "string") return;

    const uid = String(id).trim();
    text = normalizeText(text);

    try {
      markUserActive(uid);

      const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
      session.lastText = text;

      const isAdmin = uid === String(BOT.ADMIN_ID);

      // ✅ 1. Security: ban/flood check
      const allowed = await canProceed(uid, bot, text);
      if (!allowed) return;

      // ✅ 2. Hard reset
      if (text === "/start") {
        console.log(`🚀 /start from ${uid}`);
        return await safeStart(bot, uid);
      }

      // ✅ 3. Admin step (if in input mode)
      if (session.adminStep) {
        try {
          return await handleAdminAction(bot, msg, userSessions, userOrders);
        } catch (err) {
          console.error("❌ [AdminStep error]:", err.message || err);
          session.adminStep = null;
          return await bot.sendMessage(uid, "❗️ Admin error. Returning to panel.", {
            parse_mode: "Markdown",
            reply_markup: MAIN_KEYBOARD
          });
        }
      }

      // ✅ 4. Static menu routing
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

      // ✅ 5. Dynamic step-based flow
      if (typeof session.step !== "number" || session.step < 1 || session.step > 9) {
        console.warn(`⚠️ Corrupt step reset → ${uid}`);
        session.step = 1;
      }

      return await safeCall(() => handleStep(bot, uid, text, userMessages));
    } catch (err) {
      console.error("❌ [MainHandler crash]:", err.message || err);
      try {
        return await bot.sendMessage(uid, "❗️ Internal error occurred.\nTry again or type /start.", {
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
 * 🧼 Clean and trim input for safe flow matching
 */
function normalizeText(txt) {
  return txt?.toString().trim().slice(0, 4096).toLowerCase();
}

/**
 * 🛡️ Safe isolated call with crash logging
 */
async function safeCall(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("❌ [safeCall error]:", err.message || err);
  }
}
