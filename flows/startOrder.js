// 📦 flows/startOrder.js | IMMORTAL FINAL v99999999 — ULTRA-SYNC TANKLOCK MIRROR

import { userSessions, userMessages, userOrders } from "../state/userState.js";
import { sendKeyboard } from "../helpers/messageUtils.js";
import { clearTimers, clearUserMessages } from "../state/stateManager.js";

// 🌍 Region choices — must match exactly with stepHandler.js regionMap
const REGION_LIST = [
  "🗽 East Coast",
  "🌴 West Coast",
  "🛢️ South",
  "⛰️ Midwest",
  "🌲 Northwest",
  "🏜️ Southwest"
];

/**
 * 🔁 Starts a clean order from step 1 (with full memory/timer wipe)
 */
export async function startOrder(bot, id, userMsgs = {}) {
  const uid = String(id || "").trim();
  if (!bot || !uid || typeof bot.sendMessage !== "function") return;

  try {
    // 🧼 Step 1: Clean up everything for fresh order
    await clearTimers(uid);
    await clearUserMessages(uid);

    delete userSessions[uid];
    delete userOrders[uid];
    delete userMessages[uid];

    // 🚀 Step 2: Reinitialize clean session state
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

    // 📲 Step 3: Region selector UI
    const keyboard = REGION_LIST.map(r => [{ text: r }]);
    keyboard.push([{ text: "🔙 Back" }]);

    await bot.sendChatAction(uid, "typing").catch(() => {
      console.warn(`⚠️ [startOrder] chatAction failed → ${uid}`);
    });

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
