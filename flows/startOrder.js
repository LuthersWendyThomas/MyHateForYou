// 📦 flows/startOrder.js | IMMORTAL FINAL v999999999.∞+GODMODE DIAMONDLOCK SYNCED
// ULTRA-FSM SYNC • BULLETPROOF REGION KEYBOARD • FULL STATE RESET • MAXIMUM IMMUNITY

import { userSessions, userMessages, userOrders } from "../state/userState.js";
import { clearTimers, clearUserMessages } from "../state/stateManager.js";
import { MENU_BUTTONS } from "../helpers/keyboardConstants.js";
import { sendKeyboard } from "../helpers/messageUtils.js";

/**
 * 🚀 Starts a clean, FSM-synced, bulletproof order session
 */
export async function startOrder(bot, id, userMsgs = userMessages) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) {
    logError("❌ [startOrder]", "Invalid bot or UID", uid);
    return null;
  }

  try {
    await resetUserState(uid);
    initializeSession(uid);

    const keyboard = buildRegionKeyboard();
    await bot.sendChatAction(uid, "typing").catch(() => {});

    return await sendKeyboard(
      bot,
      uid,
      "🗺 *Select the region where delivery is needed:*",
      keyboard,
      userMsgs
    );
  } catch (err) {
    logError("❌ [startOrder error]", err, uid);
    return await sendKeyboard(
      bot,
      uid,
      "❗️ Unexpected error. Please try again.",
      [[{ text: MENU_BUTTONS.HELP.text }]],
      userMsgs
    );
  }
}

// ==============================
// 🧼 Helpers
// ==============================

async function resetUserState(id) {
  await clearTimers(id);
  await clearUserMessages(id);

  delete userOrders[id];
  delete userMessages[id];

  if (userSessions[id]) {
    const keys = [
      "step", "region", "city", "deliveryMethod", "deliveryFee",
      "category", "product", "quantity", "unitPrice", "totalPrice",
      "currency", "wallet", "expectedAmount", "paymentTimer",
      "paymentInProgress", "cleanupScheduled", "promoCode",
      "adminStep", "lastText"
    ];
    for (const key of keys) delete userSessions[id][key];
  }

  logAction("🧼 [resetUserState]", "State cleared", id);
}

function initializeSession(id) {
  userSessions[id] = {
    step: 1,
    createdAt: Date.now()
  };
  logAction("🔄 [initializeSession]", "Session started", id);
}

function buildRegionKeyboard() {
  try {
    const buttons = REGION_LIST.map(region => {
      if (!region || typeof region !== "string") {
        logError("⚠️ [buildRegionKeyboard]", new Error("Invalid region entry"));
        return [{ text: "❌ Invalid Region" }];
      }
      return [{ text: region }];
    });

    buttons.push([{ text: MENU_BUTTONS.HELP.text }]);
    buttons.push([{ text: MENU_BUTTONS.BACK.text }]);

    const normalized = normalizeKeyboard(buttons);
    logAction("✅ [buildRegionKeyboard]", JSON.stringify(normalized, null, 2));
    return normalized;
  } catch (err) {
    logError("❌ [buildRegionKeyboard error]", err);
    return [[{ text: "❌ Error building keyboard" }]];
  }
}

function normalizeKeyboard(keyboard) {
  if (!Array.isArray(keyboard)) {
    logError("⚠️ [normalizeKeyboard]", new Error("Invalid keyboard structure"));
    return [];
  }

  return keyboard.map(row => {
    if (!Array.isArray(row)) return [{ text: String(row).trim() }];
    return row.map(button => {
      if (!button?.text) {
        logError("⚠️ [normalizeKeyboard]", new Error("Missing button text"));
        return { text: "❌ Invalid Button" };
      }
      return {
        text: String(button.text).trim(),
        callback_data: button.callback_data ? String(button.callback_data).trim() : undefined
      };
    });
  });
}

function sanitizeId(id) {
  const uid = String(id || "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}

function logAction(action, message, uid = null) {
  console.log(`${new Date().toISOString()} ${action} → ${message}${uid ? ` (ID: ${uid})` : ""}`);
}

function logError(action, error, uid = null) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (ID: ${uid})` : ""}`);
}

// 🌍 Centralized region list
const REGION_LIST = [
  "🗽 East Coast",
  "🌴 West Coast",
  "🛢️ South",
  "⛰️ Midwest",
  "🌲 Northwest",
  "🏜️ Southwest"
];
