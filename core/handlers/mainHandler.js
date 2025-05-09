// 🧠 core/handlers/mainHandler.js | FINAL DIAMOND v2.0 BULLETPROOF SYNC

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

export function registerMainHandler(bot) {
  bot.on("message", async (msg) => {
    const id = msg.chat?.id;
    let text = msg.text;

    if (!bot || !id || !text || typeof text !== "string") return;

    const uid = String(id).trim();
    text = text.trim();

    try {
      // ✅ Mark user as active immediately
      markUserActive(uid);
      const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
      const isAdmin = uid === String(BOT.ADMIN_ID);
      const allowedMenu = Object.values(MENU_BUTTONS);

      // ✅ 1. Apply full security filter (spam, flood, mute, bans)
      const allowed = await canProceed(uid, bot, text);
      if (!allowed) return;

      // ✅ 2. Handle /start or START button
      if (text.toLowerCase() === "/start" || text === MENU_BUTTONS.START) {
        console.log(`🚀 Restart from ${uid}`);
        return await safeStart(bot, uid);
      }

      // ✅ 3. Admin flow (locked under session.adminStep)
      if (session.adminStep) {
        try {
          return await handleAdminAction(bot, msg, userSessions, userOrders);
        } catch (err) {
          console.error("❌ [Admin error]:", err.message);
          return await bot.sendMessage(uid, "❗️ Admin action failed.");
        }
      }

      // ✅ 4. Main menu routing (UI buttons)
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

      // ✅ 5. Step-based handler (flow state)
      if (typeof session.step === "number" && session.step >= 1 && session.step <= 9) {
        return await handleStep(bot, uid, text, userMessages);
      }

      // ✅ 6. Unknown / invalid input outside context — warn user
      if (!allowedMenu.includes(text)) {
        return await bot.sendMessage(
          uid,
          "⚠️ *Invalid action.*\nUse the buttons below only.",
          { parse_mode: "Markdown", ...MAIN_KEYBOARD }
        );
      }

    } catch (err) {
      console.error("❌ [mainHandler crash]:", err.message || err);
      try {
        return await bot.sendMessage(
          uid,
          "❗️ Internal error occurred.\nTry again or type /start.",
          { parse_mode: "Markdown", ...MAIN_KEYBOARD }
        );
      } catch (fail) {
        console.warn("⚠️ Failed to send fallback message:", fail.message);
      }
    }
  });
}
