// 📦 core/handlers/mainHandler.js | IMMORTAL FINAL v1.0.2•GODMODE DIAMONDLOCK+ANTI-SPAM
// ULTRA-FSM SYNC • BULLETPROOF MAIN MENU • FLOOD SHIELD • FULL ERROR‐CATCH

import { BOT, ALIASES } from "../../config/config.js";
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
import { sendKeyboard } from "../../helpers/messageUtils.js";
import { markUserActive } from "../sessionManager.js";
import { canProceed } from "../security.js";
import { isSpamming, handleFlood } from "../../utils/floodHandler.js";

/**
 * 🚪 Registers the bot’s entry points for callbacks & messages
 */
export function registerMainHandler(bot) {
  if (!bot?.on) {
    console.error("❌ [mainHandler] Invalid bot instance");
    return;
  }

  // 💥 Handle inline button callbacks
  bot.on("callback_query", async (query) => {
    const uid  = sanitizeId(query?.message?.chat?.id);
    const data = query?.data;
    if (!uid || !data) return;

    await markUserActive(uid);
    if (!(await canProceed(uid, bot))) return;

    console.log(`📥 [callback_query] ${uid}: ${data}`);

    try {
      switch (data) {
        case MENU_BUTTONS.BUY.callback_data:
          await safeCall(() => startOrder(bot, uid, userMessages), uid);
          break;
        case MENU_BUTTONS.PROFILE.callback_data:
          await safeCall(() => sendProfile(bot, uid, userMessages), uid);
          break;
        case MENU_BUTTONS.ORDERS.callback_data:
          await safeCall(() => sendOrders(bot, uid, userMessages), uid);
          break;
        case MENU_BUTTONS.HELP.callback_data:
          await safeCall(() => sendHelp(bot, uid, userMessages), uid);
          break;
        case MENU_BUTTONS.STATS.callback_data:
          if (isAdmin(uid)) {
            await safeCall(() => sendStats(bot, uid, userMessages), uid);
            break;
          }
        case MENU_BUTTONS.ADMIN.callback_data:
          if (isAdmin(uid)) {
            await safeCall(() => openAdminPanel(bot, uid), uid);
            break;
          }
        default:
          console.warn(`⚠️ Unknown callback: ${data}`);
          await bot.answerCallbackQuery(query.id, {
            text: "❌ Invalid button.",
            show_alert: true
          });
      }
    } catch (err) {
      console.error("❌ [callback_query error]:", err);
    } finally {
      await bot.answerCallbackQuery(query.id).catch(() => {});
    }
  });

  // 💬 Handle incoming text messages
  bot.on("message", async (msg) => {
    const uid = sanitizeId(msg?.chat?.id);
    const raw = msg?.text;
    if (!uid || !raw) return;

    const text = normalizeText(raw);

    // 🛡️ Anti-flood/spam protection (menu-safe)
    if (isSpamming(uid, msg)) return;
    const muted = await handleFlood(uid, bot, userMessages[uid], msg);
    if (muted) return;

    await markUserActive(uid);
    if (!(await canProceed(uid, bot, text))) return;

    console.log(`📩 [message] ${uid}: ${text}`);

    userSessions[uid] ||= { step: 1, createdAt: Date.now() };
    userSessions[uid].lastText = text;

    try {
      if (text === "/start") {
        console.log(`🚀 ${uid} triggered /start`);
        return await safeCall(() => safeStart(bot, uid), uid);
      }

      if (userSessions[uid].adminStep) {
        return await safeCall(() =>
          handleAdminAction(bot, msg, userSessions), uid
        );
      }

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

      return await safeCall(() =>
        handleStep(bot, uid, raw, userMessages, msg), uid
      );
    } catch (err) {
      console.error("❌ [message error]:", err);
    }
  });
}

// ————— HELPERS —————

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function normalizeText(txt) {
  return txt?.toString().trim().toLowerCase();
}

function isMatch(text, button) {
  return normalizeText(button?.text) === text;
}

function isAdmin(uid) {
  return String(uid) === String(BOT.ADMIN_ID);
}

async function safeCall(fn, uid = "unknown") {
  try {
    return await fn();
  } catch (err) {
    console.error(`❌ [safeCall uid=${uid}]:`, err);
  }
}
