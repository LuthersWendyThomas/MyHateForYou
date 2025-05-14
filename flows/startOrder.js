// 📦 flows/startOrder.js | IMMORTAL FINAL v999999999999999999x•GODMODE•DIAMONDLOCK•SYNCED
// FSM SAFE • BULLETPROOF RESET • QR/PAYMENT READY • REGION UX INSTANT • ZERO LEAKS

import {
  userSessions,
  userMessages
} from "../state/userState.js";

import { fullResetUserState } from "../core/sessionManager.js";
import { MENU_BUTTONS } from "../helpers/keyboardConstants.js";
import { sendKeyboard } from "../helpers/messageUtils.js";
import { getRegionKeyboard } from "../config/regions.js";

/**
 * 🚀 Start a clean FSM session with synced state and region keyboard
 */
export async function startOrder(bot, id, msgs = userMessages) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) {
    logError("❌ [startOrder]", "Invalid bot instance or UID", uid);
    return null;
  }

  try {
    // 🧼 Full cleanup: timers, wallet, messages, sessions, flags
    await fullResetUserState(uid);

    // 🌀 Start fresh session
    userSessions[uid] = {
      step: 1,
      createdAt: Date.now()
    };

    if (process.env.DEBUG_MESSAGES === "true") {
      console.debug(`🔁 [startOrder] Session initialized (UID: ${uid})`);
    }

    // ✨ UX signal
    await bot.sendChatAction(uid, "typing").catch(() => {});

    // 🗺️ Show region keyboard
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

// ————— Helpers —————

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logError(prefix, error, uid = "") {
  const msg = error?.message || error;
  console.error(`${new Date().toISOString()} ${prefix} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}
