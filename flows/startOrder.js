// 📦 flows/startOrder.js | FINAL IMMORTAL v9999999999.∞•GODMODE•DIAMONDLOCK
// ULTRA BULLETPROOF FSM START • MAX CLEANUP • INSTANT UX • REGION SYNCED

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
 * 🚀 Starts a clean FSM session and renders region keyboard
 */
export async function startOrder(bot, id, msgs = userMessages) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) {
    logError("❌ [startOrder]", "Invalid bot instance or UID", uid);
    return null;
  }

  try {
    // 🧼 1. Clean all user state (timers, messages, sessions)
    await fullResetUserState(uid);

    // 🌀 2. Init fresh session
    userSessions[uid] = {
      step: 1,
      createdAt: Date.now()
    };

    if (process.env.DEBUG_MESSAGES === "true") {
      console.debug(`🔁 [startOrder] Session initialized (UID: ${uid})`);
    }

    // 💬 3. Send typing action → render region menu
    await bot.sendChatAction(uid, "typing").catch(() => {});

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
      "⚠️ Something went wrong. Please try again.",
      [[{ text: MENU_BUTTONS.BUY.text }]],
      msgs,
      { parse_mode: "Markdown" }
    );
  }
}

// ———————————————————————
// 🧼 Bulletproof state cleaner
// ———————————————————————

async function fullResetUserState(uid) {
  try {
    await Promise.all([
      clearTimers(uid),
      clearUserMessages(uid)
    ]);

    [userOrders, userMessages, paymentTimers].forEach(store => delete store[uid]);

    if (userSessions[uid]) {
      Object.keys(userSessions[uid]).forEach(k => (userSessions[uid][k] = null));
      delete userSessions[uid];
    }

    if (process.env.DEBUG_MESSAGES === "true") {
      console.debug(`🧼 [fullResetUserState] State cleared (UID: ${uid})`);
    }
  } catch (err) {
    console.warn(`⚠️ [fullResetUserState warn] → ${err.message} (UID: ${uid})`);
  }
}

// ———————————————————————
// Helpers
// ———————————————————————

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logError(prefix, error, uid = "") {
  const msg = error?.message || error;
  console.error(`${new Date().toISOString()} ${prefix} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}
