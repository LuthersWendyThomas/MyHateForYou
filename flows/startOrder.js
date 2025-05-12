// 📦 flows/startOrder.js | IMMORTAL FINAL v1.0.0•GODMODE DIAMONDLOCK
// ULTRA-FSM SYNC • BULLETPROOF REGION KEYBOARD • FULL STATE RESET

import { userSessions, userMessages, userOrders } from "../state/userState.js";
import { clearTimers, clearUserMessages }         from "../state/stateManager.js";
import { MENU_BUTTONS }                           from "../helpers/keyboardConstants.js";
import { sendKeyboard }                           from "../helpers/messageUtils.js";
import { getRegionKeyboard }                      from "../config/regions.js";

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

    // 2) Send typing indicator
    await bot.sendChatAction(uid, "typing").catch(() => {});

    // 3) Render region selection with your centralized keyboard
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
      [[{ text: MENU_BUTTONS.HELP.text }]],
      msgs,
      { parse_mode: "Markdown" }
    );
  }
}

// ==============================
// 🧼 Helpers
// ==============================

async function resetUserState(uid) {
  // Clear any running timers or stored messages
  await clearTimers(uid);
  await clearUserMessages(uid);

  // Delete past orders / messages
  delete userOrders[uid];
  delete userMessages[uid];

  // Wipe session fields (but keep the object for reference)
  if (userSessions[uid]) {
    Object.keys(userSessions[uid]).forEach(k => {
      delete userSessions[uid][k];
    });
  }

  logAction("🧼 [resetUserState]", "State cleared", uid);
}

function initializeSession(uid) {
  userSessions[uid] = {
    step: 1,
    createdAt: Date.now(),
  };
  logAction("🔄 [initializeSession]", "Session started", uid);
}

function sanitizeId(id) {
  const uid = String(id || "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}

function logAction(action, message, uid = "") {
  console.log(`${new Date().toISOString()} ${action} → ${message}${uid ? ` (ID: ${uid})` : ""}`);
}

function logError(action, error, uid = "") {
  const msg = error?.message || error;
  console.error(`${new Date().toISOString()} ${action} → ${msg}${uid ? ` (ID: ${uid})` : ""}`);
}
