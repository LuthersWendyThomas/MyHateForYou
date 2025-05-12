// 🧠 core/handlers/mainHandler.js | FINAL IMMORTAL v999999999∞+SYNC FIXED

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
      const uid = String(id).trim();
      text = text.trim();

      // ✅ Užregistruojam aktyvų naudotoją
      markUserActive(uid);

      const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
      const isAdmin = uid === String(BOT.ADMIN_ID);
      const allowedMenu = Object.values(MENU_BUTTONS).map(btn => btn.text);

      // ✅ 1. Anti-flood / saugumas
      if (!(await canProceed(uid, bot, text))) return;

      // ✅ 2. /start
      if (text.toLowerCase() === "/start" || text === MENU_BUTTONS.START?.text) {
        console.log(`🚀 /start iš ${uid}`);
        return await safeStart(bot, uid);
      }

      // ✅ 3. Admin valdymas (jei aktyvi sesija)
      if (session.adminStep) {
        try {
          return await handleAdminAction(bot, msg, userSessions, userOrders);
        } catch (err) {
          console.error("❌ [Admin klaida]:", err.message);
          return await bot.sendMessage(uid, "❗️ Admin veiksmas nepavyko.");
        }
      }

      // ✅ 4. Pagrindiniai meniu pasirinkimai
      switch (text) {
        case MENU_BUTTONS.BUY.text:
          return await startOrder(bot, uid, userMessages);
        case MENU_BUTTONS.PROFILE.text:
          return await sendProfile(bot, uid, userMessages);
        case MENU_BUTTONS.ORDERS.text:
          return await sendOrders(bot, uid, uid, userMessages);
        case MENU_BUTTONS.HELP.text:
          return await sendHelp(bot, uid, userMessages);
        case MENU_BUTTONS.STATS.text:
          if (isAdmin) return await sendStats(bot, uid, userMessages);
          break;
        case MENU_BUTTONS.ADMIN.text:
          if (isAdmin) return await openAdminPanel(bot, uid);
          break;
      }

      // ✅ 5. Aktyvus žingsnių srautas (1–9)
      if (typeof session.step === "number" && session.step >= 1 && session.step <= 9) {
        return await handleStep(bot, uid, text, userMessages);
      }

      // ✅ 6. Neatpažinta įvestis
      if (!allowedMenu.includes(text)) {
        return await bot.sendMessage(
          uid,
          "⚠️ *Neleistinas veiksmas.*\nNaudokite mygtukus apačioje.",
          { parse_mode: "Markdown", ...MAIN_KEYBOARD }
        );
      }

    } catch (err) {
      console.error("❌ [mainHandler kritinė klaida]:", err.message || err);
      try {
        await bot.sendMessage(
          msg.chat.id,
          "❗️ Vidinė klaida. Bandykite dar kartą.",
          { parse_mode: "Markdown", ...MAIN_KEYBOARD }
        );
      } catch {}
    }
  });
}
