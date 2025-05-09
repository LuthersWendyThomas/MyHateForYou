// 📦 flows/startOrder.js | IMMORTAL FINAL v9999999 — ULTRA-SYNC TANKLOCK

import { userSessions, userMessages, userOrders } from "../state/userState.js";
import { sendKeyboard } from "../helpers/messageUtils.js";
import { clearTimers, clearUserMessages } from "../state/stateManager.js";

// 🌍 Must match stepHandler.js regionMap keys exactly
const REGION_LIST = [
  "🗽 East Coast",
  "🌴 West Coast",
  "🛢️ South",
  "⛰️ Midwest",
  "🌲 Northwest",
  "🏜️ Southwest"
];

/**
 * 🔁 Starts a 100% clean new order flow (step 1)
 */
export async function startOrder(bot, id, userMsgs = {}) {
  const uid = String(id || "").trim();
  if (!bot || !uid || typeof bot.sendMessage !== "function") return;

  try {
    // 🧼 1. Full cleanup: session, timers, messages, order count
    await clearTimers(uid);
    await clearUserMessages(uid);

    delete userSessions[uid];
    delete userOrders[uid];
    delete userMessages[uid];

    // 🔒 2. Reinit session
    userSessions[uid] = {
      step: 1,
      createdAt: Date.now(),

      region: null,
      city: null,

      deliveryMethod: null,
      deliveryFee: 0,

      category: null,
      product: null,
      quantity: null,
      unitPrice: 0,
      totalPrice: 0,

      currency: null,
      wallet: null,
      expectedAmount: null,

      paymentTimer: null,
      paymentInProgress: false,
      cleanupScheduled: false
    };

    // ⌨️ 3. Show keyboard
    const keyboard = REGION_LIST.map(r => [{ text: r }]);
    keyboard.push([{ text: "🔙 Back" }]);

    await bot.sendChatAction(uid, "typing").catch(() =>
      console.warn(`⚠️ [startOrder] chatAction failed: ${uid}`)
    );

    return await sendKeyboard(
      bot,
      uid,
      "🗺 *Select the region where delivery is needed:*",
      keyboard,
      userMsgs
    );

  } catch (err) {
    console.error("❌ [startOrder error]:", err.message || err);
    return await sendKeyboard(
      bot,
      uid,
      "❗️ Unexpected error. Please try again.",
      [[{ text: "🔁 Try again" }]],
      userMsgs
    );
  }
}
