// 📦 flows/startOrder.js | IMMORTAL FINAL v1.0.2•999999x•DIAMONDLOCK+SYNC+PERFECTION
// BULLETPROOF FSM START • FULL STATE CLEANUP • TIMER KILL • REGION RENDER SYNCED

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
 * 🚀 Initializes a fully reset FSM session and renders region step
 */
export async function startOrder(bot, id, msgs = userMessages) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) {
    logError("❌ [startOrder]", "Invalid bot instance or UID", uid);
    return null;
  }

  try {
    // 🧼 1. Kill old payment timers + clear all user state
    await fullResetUserState(uid);

    // 🌀 2. Init new session
    userSessions[uid] = {
      step: 1,
      createdAt: Date.now()
    };

    if (process.env.DEBUG_MESSAGES === "true") {
      console.debug(`🔁 [startOrder] Session initialized (ID: ${uid})`);
    }

    // 🕐 3. Show "typing…" for UX polish
    await bot.sendChatAction(uid, "typing").catch(() => {});

    // 🧭 4. Region keyboard
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

// ———————————————————————
// 🧼 Ultra-safe state cleaner
// ———————————————————————

async function fullResetUserState(uid) {
  try {
    await clearTimers(uid);
    await clearUserMessages(uid);

    delete userOrders[uid];
    delete userMessages[uid];
    delete paymentTimers[uid];

    if (userSessions[uid]) {
      for (const k in userSessions[uid]) {
        delete userSessions[uid][k];
      }
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
  const s = String(id || "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logError(prefix, error, uid = "") {
  const msg = error?.message || error;
  console.error(`${new Date().toISOString()} ${prefix} → ${msg}${uid ? ` (ID: ${uid})` : ""}`);
}
