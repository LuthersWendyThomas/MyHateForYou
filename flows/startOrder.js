// 📦 flows/startOrder.js | IMMORTAL FINAL v1.0.1•GODMODE+SYNC+BULLETPROOF
// ULTRA-FSM SYNC • REGION KEYBOARD • FULL STATE RESET + PAYMENT TIMER CLEAN

import {
  userSessions,
  userMessages,
  userOrders,
  paymentTimers
} from "../state/userState.js";

import { clearTimers, clearUserMessages } from "../state/stateManager.js";
import { MENU_BUTTONS } from "../helpers/keyboardConstants.js";
import { sendKeyboard } from "../helpers/messageUtils.js";
import { getRegionKeyboard } from "../config/regions.js";

/**
 * 🚀 Starts a clean, FSM-synced, bulletproof order session
 */
export async function startOrder(bot, id, msgs = userMessages) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) {
    logError("❌ [startOrder]", "Invalid bot instance or UID", uid);
    return null;
  }

  try {
    // 1) Reset all user state
    await resetUserState(uid);
    initializeSession(uid);

    // 2) Clean lingering payment timeout if exists
    if (paymentTimers[uid]) {
      clearTimeout(paymentTimers[uid]);
      delete paymentTimers[uid];
    }

    // 3) Send typing action
    await bot.sendChatAction(uid, "typing").catch(() => {});

    // 4) Render region selection
    const keyboard = getRegionKeyboard();
    return await sendKeyboard(
      bot,
      uid,
      "🗺️ *Select the region where delivery is needed:*",
      keyboard,
      msgs,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    logError("❌ [startOrder error]", err, uid);
    return await sendKeyboard(
      bot,
      uid,
      "❗️ Unexpected error. Please try again.",
      [[{ text: MENU_BUTTONS.BUY.text }]],
      msgs,
      { parse_mode: "Markdown" }
    );
  }
}

// —————————————————————
// 🧼 Helpers
// —————————————————————

async function resetUserState(uid) {
  await clearTimers(uid);
  await clearUserMessages(uid);

  delete userOrders[uid];
  delete userMessages[uid];

  if (userSessions[uid]) {
    Object.keys(userSessions[uid]).forEach(k => delete userSessions[uid][k]);
  }

  if (process.env.DEBUG_MESSAGES === "true") {
    console.debug(`🧼 [resetUserState] State cleared (ID: ${uid})`);
  }
}

function initializeSession(uid) {
  if (!userSessions[uid]) userSessions[uid] = {};
  userSessions[uid].step = 1;
  userSessions[uid].createdAt = Date.now();

  if (process.env.DEBUG_MESSAGES === "true") {
    console.debug(`🔄 [initializeSession] FSM started (ID: ${uid})`);
  }
}

function sanitizeId(id) {
  const uid = String(id || "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}

function logError(prefix, error, uid = "") {
  const msg = error?.message || error;
  console.error(`${new Date().toISOString()} ${prefix} → ${msg}${uid ? ` (ID: ${uid})` : ""}`);
}
