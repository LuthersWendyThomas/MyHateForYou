// 📦 flows/startOrder.js | FINAL v2.2 — REGION FLOW BULLETPROOF TANKLOCK

import { userSessions, userMessages, userOrders } from "../state/userState.js";
import { sendKeyboard } from "../helpers/messageUtils.js";
import { clearTimers, clearUserMessages } from "../state/stateManager.js";

// 🌐 Centralized region list (synced with stepHandler.js)
const REGION_LIST = [
  "🗽 East Coast",
  "🌴 West Coast",
  "🛢️ South",
  "⛰️ Midwest",
  "🌲 Northwest",
  "🏜️ Southwest"
];

/**
 * 🎯 Starts a clean order session (step 1: region)
 */
export async function startOrder(bot, id, userMsgs = {}) {
  const uid = String(id || "").trim();
  if (!bot || !uid || typeof bot.sendMessage !== "function") return;

  try {
    // 🧼 1. Full cleanup of user's timers & messages
    await clearTimers(uid);
    await clearUserMessages(uid);

    delete userSessions[uid];
    delete userOrders[uid];

    // 🛡️ 2. New clean session setup
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

    // 📲 3. Prepare keyboard with region list
    const keyboard = REGION_LIST.map(r => [{ text: r }]);
    keyboard.push([{ text: "🔙 Back" }]);

    // ⌨️ 4. UX: show typing before sending
    await bot.sendChatAction(uid, "typing").catch(() => {
      console.warn(`⚠️ [startOrder] ChatAction failed → ${uid}`);
    });

    // 🗺️ 5. Prompt user to select region
    return await sendKeyboard(
      bot,
      uid,
      "🗺 *Select the region* where you want to receive the shipment:",
      keyboard,
      userMsgs
    );

  } catch (err) {
    console.error("❌ [startOrder fatal]:", err.message || err);

    return await sendKeyboard(
      bot,
      uid,
      "❗️ Unexpected error. Please try again later.",
      [[{ text: "🔁 Try again" }]],
      userMsgs
    );
  }
}
