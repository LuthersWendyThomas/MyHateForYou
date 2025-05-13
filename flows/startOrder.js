// 📦 flows/startOrder.js | FINAL v9999999999.∞+SYNC+TYPERUSH+MEMFIX
// BULLETPROOF FSM START • ULTRA CLEANUP • INSTANT UX • REGION SYNCED

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
    // 🧼 1. Clean all past data
    await fullResetUserState(uid);

    // 🌀 2. Init FSM session
    userSessions[uid] = {
      step: 1,
      createdAt: Date.now()
    };

    if (process.env.DEBUG_MESSAGES === "true") {
      console.debug(`🔁 [startOrder] Session initialized (ID: ${uid})`);
    }

    // 💬 3. Send typing first (ensured no throw), then region menu
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
// 🧼 Ultra-safe user state cleaner
// ———————————————————————

async function fullResetUserState(uid) {
  try {
    await Promise.all([
      clearTimers(uid),
      clearUserMessages(uid)
    ]);

    delete userOrders[uid];
    delete userMessages[uid];
    delete paymentTimers[uid];

    if (userSessions[uid]) {
      for (const key in userSessions[uid]) {
        userSessions[uid][key] = null;
      }
      delete userSessions[uid];
    }

    if (process.env.DEBUG_MESSAGES === "true") {
      console.debug(`🧼 [fullResetUserState] Cleared user state (ID: ${uid})`);
    }
  } catch (err) {
    console.warn(`⚠️ [resetUserState warn] → ${err.message} (ID: ${uid})`);
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
  console.error(`${new Date().toISOString()} ${prefix} → ${msg}${uid ? ` (ID: ${uid})` : ""}`);
}
