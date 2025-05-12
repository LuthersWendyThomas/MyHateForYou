// 📦 core/handlers/mainHandler.js | IMMORTAL FINAL v999999999.∞.ULTIMATE.GODMODE+SYNC+DIAMONDLOCK
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
import { MENU_BUTTONS } from "../../helpers/keyboardConstants.js";
import { getMainMenu } from "../../helpers/menu.js";
import { markUserActive } from "../sessionManager.js";
import { canProceed } from "../security.js";

// ✅ Register all Telegram handlers
export function registerMainHandler(bot) {
  if (!bot?.on) {
    console.error("❌ [mainHandler] Invalid bot instance");
    return;
  }

  // 💥 CALLBACK HANDLER (button clicks)
  bot.on("callback_query", async (query) => {
    const uid = String(query?.message?.chat?.id || "").trim();
    const data = query?.data;
    if (!uid || !data) return;

    try {
      markUserActive(uid);
      if (!(await canProceed(uid, bot))) return;

      console.log(`📥 [callback_query] ${uid}: ${data}`);

      if (data === MENU_BUTTONS.STATS.callback_data && isAdmin(uid)) {
        return await safeCall(() => sendStats(bot, uid, userMessages), uid);
      }

      if (data === MENU_BUTTONS.ADMIN.callback_data && isAdmin(uid)) {
        return await safeCall(() => openAdminPanel(bot, uid), uid);
      }

      switch (data) {
        case MENU_BUTTONS.BUY.callback_data:
          return await safeCall(() => startOrder(bot, uid, userMessages), uid);
        case MENU_BUTTONS.PROFILE.callback_data:
          return await safeCall(() => sendProfile(bot, uid, userMessages), uid);
        case MENU_BUTTONS.ORDERS.callback_data:
          return await safeCall(() => sendOrders(bot, uid, userMessages), uid);
        case MENU_BUTTONS.HELP.callback_data:
          return await safeCall(() => sendHelp(bot, uid, userMessages), uid);
        default:
          console.warn(`⚠️ Unknown callback: ${data}`);
          return await bot.answerCallbackQuery(query.id, {
            text: "❌ Invalid button.",
            show_alert: true,
          });
      }
    } catch (err) {
      console.error("❌ [callback_query error]:", err.message || err);
    } finally {
      await bot.answerCallbackQuery(query.id).catch(() => {});
    }
  });

  // 💬 TEXT HANDLER (user input)
  bot.on("message", async (msg) => {
    const uid = String(msg?.chat?.id || "").trim();
    const text = normalizeText(msg?.text);

    if (!uid || !text) return;

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

      // Static button matchers
      if (isMatch(text, MENU_BUTTONS.BUY)) {
        return await safeCall(() => startOrder(bot, uid, userMessages), uid);
      }
      if (isMatch(text, MENU_BUTTONS.PROFILE)) {
        return await safeCall(() => sendProfile(bot, uid, userMessages), uid);
      }
      if (isMatch(text, MENU_BUTTONS.ORDERS)) {
        return await safeCall(() => sendOrders(bot, uid, userMessages), uid);
      }
      if (isMatch(text, MENU_BUTTONS.HELP)) {
        return await safeCall(() => sendHelp(bot, uid, userMessages), uid);
      }
      if (isMatch(text, MENU_BUTTONS.STATS) && isAdmin(uid)) {
        return await safeCall(() => sendStats(bot, uid, userMessages), uid);
      }
      if (isMatch(text, MENU_BUTTONS.ADMIN) && isAdmin(uid)) {
        return await safeCall(() => openAdminPanel(bot, uid), uid);
      }

      // Default → FSM flow
      return await safeCall(() => handleStep(bot, uid, text, userMessages), uid);
    } catch (err) {
      console.error("❌ [message error]:", err.message || err);
    }
  });
}

// ————— HELPERS —————

function normalizeText(txt) {
  return txt?.toString().trim().toLowerCase();
}

function isMatch(text, button) {
  return normalizeText(button?.text) === text;
}

function isAdmin(id) {
  return String(id) === String(BOT.ADMIN_ID);
}

async function safeCall(fn, uid = "unknown") {
  try {
    return await fn();
  } catch (err) {
    console.error(`❌ [safeCall uid=${uid}]:`, err.message || err);
  }
}
