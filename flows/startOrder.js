// 📦 flows/startOrder.js | IMMORTAL FINAL v9999999999.∞+GODMODE+POLISH+SYNC
// BULLETPROOF FSM START • ULTRA CLEANUP • TYPING UX • REGION SYNC

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
    // 🧼 1. Wipe all previous state
    await fullResetUserState(uid);

    // 🌀 2. Init new FSM session
    userSessions[uid] = {
      step: 1,
      createdAt: Date.now()
    };

    if (process.env.DEBUG_MESSAGES === "true") {
      console.debug(`🔁 [startOrder] Session initialized (ID: ${uid})`);
    }

    // 💬 3. Typing feedback
    bot.sendChatAction(uid, "typing").catch(() => {}).finally(() => {});

    // 📍 4. Render region selection
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
    await clearTimers(uid);
    await clearUserMessages(uid);

    delete userOrders[uid];
    delete userMessages[uid];
    delete paymentTimers[uid];

    if (userSessions[uid]) {
      for (const key in userSessions[uid]) {
        delete userSessions[uid][key];
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
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logError(prefix, error, uid = "") {
  const msg = error?.message || error;
  console.error(`${new Date().toISOString()} ${prefix} → ${msg}${uid ? ` (ID: ${uid})` : ""}`);
}
