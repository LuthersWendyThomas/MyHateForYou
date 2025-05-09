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
 * 🔐 Registers the core handler for all incoming Telegram messages
 */
export function registerMainHandler(bot) {
  bot.on("message", async (msg) => {
    const id = msg.chat?.id;
    let text = msg.text;

    if (!bot || !id || typeof text !== "string") return;

    const uid = String(id).trim();
    text = text.toString().trim().slice(0, 4096); // Normalize input

    try {
      markUserActive(uid);

      const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
      const isAdmin = uid === String(BOT.ADMIN_ID);

      // ✅ 1. Security gate (flood/ban checks)
      if (!(await canProceed(uid, bot, text))) return;

      // ✅ 2. Hard restart
      if (text.toLowerCase() === "/start" || text === MENU_BUTTONS.START) {
        console.log(`🚀 Restart from ${uid}`);
        return await safeStart(bot, uid);
      }

      // ✅ 3. Admin action in progress (step-based)
      if (session.adminStep) {
        try {
          return await handleAdminAction(bot, msg, userSessions, userOrders);
        } catch (err) {
          console.error("❌ [AdminStep error]:", err.message || err);
          session.adminStep = null;
          return await bot.sendMessage(
            uid,
            "❗️ Admin error. Returning to admin panel.",
            { parse_mode: "Markdown", reply_markup: MAIN_KEYBOARD }
          );
        }
      }

      // ✅ 4. Menu routing
      switch (text) {
        case MENU_BUTTONS.BUY:
          return await startOrder(bot, uid, userMessages);

        case MENU_BUTTONS.PROFILE:
          return await sendProfile(bot, uid, userMessages);

        case MENU_BUTTONS.ORDERS:
          return await sendOrders(bot, uid, uid, userMessages);

        case MENU_BUTTONS.HELP:
          return await sendHelp(bot, uid, userMessages);

        case MENU_BUTTONS.STATS:
          if (isAdmin) return await sendStats(bot, uid, userMessages);
          break;

        case MENU_BUTTONS.ADMIN:
          if (isAdmin) return await openAdminPanel(bot, uid);
          break;
      }

      // ✅ 5. Step-based order flow
      if (typeof session.step === "number" && session.step >= 1 && session.step <= 9) {
        return await handleStep(bot, uid, text, userMessages);
      }

      // 🧯 6. Fallback → reset to safeStart
      console.warn(`⚠️ [Fallback] Resetting session for ${uid}`);
      session.step = 1;
      return await safeStart(bot, uid);

    } catch (err) {
      console.error("❌ [MainHandler crash]:", err.message || err);
      try {
        return await bot.sendMessage(
          uid,
          "❗️ Internal error occurred.\nTry again or type /start.",
          { parse_mode: "Markdown", reply_markup: MAIN_KEYBOARD }
        );
      } catch (fail) {
        console.warn("⚠️ [Fallback send failed]:", fail.message);
      }
    }
  });
}
