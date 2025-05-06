// 📦 flows/startOrder.js | BalticPharma V2 — REGION-MODE FINAL v2.6.9

import { userSessions, userMessages, userOrders } from "../state/userState.js";
import { sendKeyboard } from "../helpers/messageUtils.js";
import { clearTimers, clearUserMessages } from "../state/stateManager.js";

/**
 * Initiates a clean order start from the first step (region selection)
 */
export async function startOrder(bot, id, userMsgs = {}) {
  const uid = String(id);
  if (!bot || !uid) return;

  try {
    // — 1. Full cleanup
    await clearTimers(uid);
    await clearUserMessages(uid);

    delete userSessions[uid];
    delete userOrders[uid];

    // — 2. New blank session
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

    // — 3. Define static region list (synced with stepHandler)
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

    // Enhanced flow: ensure the user is typing before we send the message.
    await bot.sendChatAction(uid, "typing").catch(() => {});

    return await sendKeyboard(
      bot,
      uid,
      "🗺 *Select the region* where you want to receive the shipment:",
      keyboard,
      userMsgs
    );

  } catch (err) {
    // Enhanced error handling and retry suggestion
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
