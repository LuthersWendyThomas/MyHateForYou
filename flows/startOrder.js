// 📦 flows/startOrder.js | BalticPharma V2 — IMMORTAL v2.6.1 TITAN-GRADE SHINE POLISH

import { userSessions, userMessages, userOrders } from "../state/userState.js";
import { cities } from "../config/features.js";
import { sendKeyboard } from "../helpers/messageUtils.js";
import { clearTimers, clearUserMessages } from "../state/stateManager.js";

/**
 * Inicijuoja švarų užsakymo startą nuo pirmo žingsnio (miesto)
 */
export async function startOrder(bot, id, userMsgs = {}) {
  const uid = String(id);
  if (!bot || !uid) return;

  try {
    // — 1. Išvalom visą user sesiją ir žinutes
    await clearTimers(uid);
    await clearUserMessages(uid);

    delete userSessions[uid];
    delete userOrders[uid];

    // — 2. Nauja tuščia sesija su visais laukais
    userSessions[uid] = {
      step: 1,
      createdAt: Date.now(),

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

    // — 3. Tikrinam ar miestai prieinami
    const validCities = Array.isArray(cities)
      ? cities.filter(c => typeof c === "string" && c.trim().length > 0)
      : [];

    if (validCities.length === 0) {
      return await sendKeyboard(
        bot,
        uid,
        "⚠️ The list of cities is currently unavailable..",
        [[{ text: "🔁 Try again" }]],
        userMsgs
      );
    }

    // — 4. Generuojam mygtukus ir siunčiam pasirinkimą
    const keyboard = validCities.map(city => [{ text: city }]);
    keyboard.push([{ text: "🔙 Back" }]);

    await bot.sendChatAction(uid, "typing").catch(() => {});

    return await sendKeyboard(
      bot,
      uid,
      "🌍 *Select the city* where you want to receive the shipment:",
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
