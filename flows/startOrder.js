// 📦 flows/startOrder.js | FINAL v2.1 — REGION FLOW BULLETPROOF POLISH

import { userSessions, userMessages, userOrders } from "../state/userState.js";
import { sendKeyboard } from "../helpers/messageUtils.js";
import { clearTimers, clearUserMessages } from "../state/stateManager.js";

// 💡 Centralized region list (synced with stepHandler.js)
const REGION_LIST = [
  "🗽 East Coast",
  "🌴 West Coast",
  "🛢️ South",
  "⛰️ Midwest",
  "🌲 Northwest",
  "🏜️ Southwest"
];

/**
 * 🎯 Starts a fresh order session (region → city → method → etc.)
 */
export async function startOrder(bot, id, userMsgs = {}) {
  const uid = String(id || "").trim();
  if (!bot || !uid) return;

  try {
    // 🧼 1. Full cleanup of user session
    await clearTimers(uid);
    await clearUserMessages(uid);

    delete userSessions[uid];
    delete userOrders[uid];

    // 🛡️ 2. Start clean state session
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

    // 🧭 3. Generate region keyboard
    const keyboard = REGION_LIST.map(r => [{ text: r }]);
    keyboard.push([{ text: "🔙 Back" }]);

    // 🕐 4. UX improvement: show typing
    await bot.sendChatAction(uid, "typing").catch(() => {
      console.warn(`⚠️ [startOrder] Typing failed for ${uid}`);
    });

    // 📬 5. Ask user to choose region
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
