// 📦 flows/startOrder.js | FINAL IMMORTAL v9999999999.∞•GODMODE•DIAMONDLOCK
// ULTRA BULLETPROOF FSM START • MAX CLEANUP • INSTANT UX • REGION SYNCED

import {
  userSessions,
  userMessages
} from "../state/userState.js";

import { fullResetUserState } from "../core/sessionManager.js"; // ✅ NEW SYNCED RESET
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
    await fullResetUserState(uid); // ✅ USE SYNCED MASTER RESET

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
