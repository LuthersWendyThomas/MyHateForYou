// 📦 flows/startOrder.js | IMMORTAL FINAL v999999999 — ULTRA-SYNC TANKLOCK MIRROR + 24/7 SAFE RESET

import { userSessions, userMessages, userOrders } from "../state/userState.js";
import { sendKeyboard } from "../helpers/messageUtils.js";
import { clearTimers, clearUserMessages } from "../state/stateManager.js";

// 🌍 Region choices — must match config/regions.js + stepHandler.js
const REGION_LIST = [
  "🗽 East Coast",
  "🌴 West Coast",
  "🛢️ South",
  "⛰️ Midwest",
  "🌲 Northwest",
  "🏜️ Southwest"
];

/**
 * 🧼 Starts a fully clean order session — safe for retry or new user
 */
export async function startOrder(bot, id, userMsgs = {}) {
  const uid = String(id || "").trim();
  if (!bot || !uid || typeof bot.sendMessage !== "function") return;

  try {
    // 🔁 1. Total reset of previous session state
    await clearTimers(uid);
    await clearUserMessages(uid);

    delete userOrders[uid];
    delete userMessages[uid];

    if (userSessions[uid]) {
      const fields = [
        "step", "region", "city", "deliveryMethod", "deliveryFee",
        "category", "product", "quantity", "unitPrice", "totalPrice",
        "currency", "wallet", "expectedAmount", "paymentTimer",
        "paymentInProgress", "cleanupScheduled", "promoCode"
      ];
      for (const key of fields) {
        delete userSessions[uid][key];
      }
    }

    // 🔄 2. Initialize clean session
    userSessions[uid] = {
      step: 1,
      createdAt: Date.now()
    };

    // ⌨️ 3. Show region selector
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
