// 📦 flows/startOrder.js | FINAL v2.0 — REGION FLOW ULTRASYNC EDITION

import { userSessions, userMessages, userOrders } from "../state/userState.js";
import { sendKeyboard } from "../helpers/messageUtils.js";
import { clearTimers, clearUserMessages } from "../state/stateManager.js";

/**
 * 🧼 Starts a fresh order session (region → city → method → etc.)
 */
export async function startOrder(bot, id, userMsgs = {}) {
  const uid = String(id);
  if (!bot || !uid) return;

  try {
    // — 1. Full cleanup of user state
    await clearTimers(uid);
    await clearUserMessages(uid);

    delete userSessions[uid];
    delete userOrders[uid];

    // — 2. Start clean session
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
      cleanupScheduled: false,
      paymentInProgress: false
    };

    // — 3. Predefined region list (synced with stepHandler.js)
    const regions = [
      "🗽 East Coast",
      "🌴 West Coast",
      "🛢️ South",
      "⛰️ Midwest",
      "🌲 Northwest",
      "🏜️ Southwest"
    ];

    const keyboard = regions.map(r => [{ text: r }]);
    keyboard.push([{ text: "🔙 Back" }]);

    // — 4. UX: send typing action
    await bot.sendChatAction(uid, "typing").catch(() => {});

    // — 5. Ask user to choose a region
    return await sendKeyboard(
      bot,
      uid,
      "🗺 *Select the region* where you want to receive the shipment:",
      keyboard,
      userMsgs
    );

  } catch (err) {
    console.error("❌ [startOrder error]:", err.message || err);

    return await sendKeyboard(
      bot,
      uid,
      "❗️ Error starting order. Please try again.",
      [[{ text: "🔁 Try again" }]],
      userMsgs
    );
  }
}
