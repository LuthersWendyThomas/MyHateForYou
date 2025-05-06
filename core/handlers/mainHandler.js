// 🧠 core/handlers/mainHandler.js | IMMORTAL REGION UI v1.0 FINAL

import { BOT } from "../../config/config.js";
import {
  userSessions,
  userMessages,
  userOrders
} from "../../state/userState.js";
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

export function registerMainHandler(bot) {
  bot.on("message", async (msg) => {
    const id = msg.chat?.id;
    let text = msg.text;

    if (!bot || !id || !text || typeof text !== "string") return;

    try {
      const uid = String(id);
      text = text.trim();

      // ✅ Ensure user is marked active and session is initialized
      markUserActive(uid);
      const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
      const isAdmin = uid === String(BOT.ADMIN_ID);
      const allowedMenu = Object.values(MENU_BUTTONS);

      // ✅ 1. Anti-spam / flood / ban
      if (!(await canProceed(uid, bot, text))) return;

      // ✅ 2. Start – starts a fresh session
      if (text.toLowerCase() === "/start" || text === MENU_BUTTONS.START) {
        console.log(`🚀 /start from ${uid}`);
        return await safeStart(bot, uid);
      }

      // ✅ 3. Admin flow
      if (session.adminStep) {
        try {
          return await handleAdminAction(bot, msg, userSessions, userOrders);
        } catch (err) {
          console.error("❌ [Admin error]:", err.message);
          return await bot.sendMessage(uid, "❗️ Admin action failed.");
        }
      }

      // ✅ 4. Menu options
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

      // ✅ 5. If step flow is active
      if (typeof session.step === "number" && session.step >= 1 && session.step <= 9) {
        return await handleStep(bot, uid, text, userMessages);
      }

      // ✅ 6. Unrecognized or unauthorized input
      if (!allowedMenu.includes(text)) {
        return await bot.sendMessage(
          uid,
          "⚠️ *Illegal action.*\nUse the buttons below.",
          { parse_mode: "Markdown", ...MAIN_KEYBOARD }
        );
      }

    } catch (err) {
      console.error("❌ [mainHandler fatal error]:", err.message || err);
      try {
        await bot.sendMessage(
          msg.chat.id,
          "❗️ Internal error. Please try again..",
          { parse_mode: "Markdown", ...MAIN_KEYBOARD }
        );
      } catch {}
    }
  });
}
