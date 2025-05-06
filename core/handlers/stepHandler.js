// 🧠 core/handlers/stepHandler.js | BalticPharma V2 — IMMORTAL v4.4.1 DIAMOND FIXED QR EDITION

import { cities, deliveryMethods } from "../../config/features.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { userSessions } from "../../state/userState.js";
import { sendKeyboard, sendAndTrack } from "../../helpers/messageUtils.js";
import { punish } from "../../utils/punishUser.js";
import { handlePayment, handlePaymentConfirmation } from "./paymentHandler.js";
import { resetSession, safeStart } from "./finalHandler.js";

export async function handleStep(bot, id, text, userMessages) {
  const s = (userSessions[id] ||= { step: 1, createdAt: Date.now() });
  const input = text?.trim();

  if (!input || typeof input !== "string") {
    return await punish(bot, id, userMessages);
  }

  // 🔙 Back logika
  if (input === "🔙 Back") {
    if (s.step > 1) {
      s.step--;
      return renderStep(bot, id, s.step, userMessages);
    } else {
      await resetSession(id);
      return await safeStart(bot, id);
    }
  }

  try {
    switch (s.step) {
      case 1:
        if (!cities.includes(input)) return await punish(bot, id, userMessages);
        s.city = input;
        break;

      case 2:
        const method = deliveryMethods.find(m => m.label === input);
        if (!method) return await punish(bot, id, userMessages);
        s.deliveryMethod = method.key;
        s.deliveryFee = method.fee;
        break;

      case 3:
        if (!products[input]) return await punish(bot, id, userMessages);
        s.category = input;
        break;

      case 4:
        const prod = products[s.category]?.find(p => p.name === input);
        if (!prod || typeof prod !== "object") return await punish(bot, id, userMessages);
        s.product = prod;
        break;

      case 5:
        const qty = input?.match(/^[^\s(]+/)?.[0];
        const price = s.product?.prices?.[qty];
        const qtyNum = parseInt(qty, 10);
        if (!price || isNaN(qtyNum)) return await punish(bot, id, userMessages);
        s.quantity = qty;
        s.unitPrice = price;
        s.totalPrice = price + s.deliveryFee;
        break;

      case 6:
        const wallet = WALLETS[input];
        if (!wallet || typeof wallet !== "string" || wallet.length < 8)
          return await punish(bot, id, userMessages);
        s.currency = input;
        s.wallet = wallet;
        break;

      case 7:
        if (input !== "✅ CONFIRM") return await punish(bot, id, userMessages);
        return await handlePayment(bot, id, userMessages);

      case 8:
        if (input === "✅ CONFIRM") {
          s.step = 9;
          return await handlePaymentConfirmation(bot, id, userMessages);
        }
        if (input === "❌ Cancel payment") {
          await sendAndTrack(bot, id, "❌ Payment cancelled. Returning to the start.", {}, userMessages);
          await resetSession(id);
          return await safeStart(bot, id);
        }
        return await punish(bot, id, userMessages);

      default:
        userSessions[id] = { step: 1, createdAt: Date.now() };
        return renderStep(bot, id, 1, userMessages);
    }

    s.step++;
    return renderStep(bot, id, s.step, userMessages);
  } catch (err) {
    console.error("❌ [handleStep error]:", err.message);
    return await punish(bot, id, userMessages);
  }
}

function renderStep(bot, id, step, userMessages) {
  const s = userSessions[id] ||= { step: 1 };

  try {
    switch (step) {
      case 1:
        return sendKeyboard(
          bot,
          id,
          "🌍 *Select your city:*",
          cities.map(c => [{ text: c }]).concat([[{ text: "🔙 Back" }]]),
          userMessages
        );

      case 2:
        return sendKeyboard(
          bot,
          id,
          "🚛 *Choose delivery method:*",
          deliveryMethods.map(m => [{ text: m.label }]).concat([[{ text: "🔙 Back" }]]),
          userMessages
        );

      case 3:
        return sendKeyboard(
          bot,
          id,
          "📋 *Select product category:*",
          Object.keys(products).map(k => [{ text: k }]).concat([[{ text: "🔙 Back" }]]),
          userMessages
        );

      case 4:
        const cat = products[s.category] || [];
        return sendKeyboard(
          bot,
          id,
          "📦 *Choose a product:*",
          cat.map(p => [{ text: p.name }]).concat([[{ text: "🔙 Back" }]]),
          userMessages
        );

      case 5:
        return sendKeyboard(
          bot,
          id,
          "⚖️ *Select quantity:*",
          Object.entries(s.product?.prices || {}).map(([q, p]) => [{ text: `${q} (${p}€)` }]).concat([[{ text: "🔙 Back" }]]),
          userMessages
        );

      case 6:
        const networks = Object.keys(WALLETS).reduce((rows, key) => {
          const last = rows[rows.length - 1];
          if (last && last.length < 2) last.push({ text: key });
          else rows.push([{ text: key }]);
          return rows;
        }, []);
        networks.push([{ text: "🔙 Back" }]);
        return sendKeyboard(
          bot,
          id,
          "💳 *Select payment network:*",
          networks,
          userMessages
        );

      case 7:
        const summary = `📜 *Order summary:*\n\n` +
          `• City: ${s.city}\n` +
          `• Delivery: ${s.deliveryMethod} (${s.deliveryFee}€)\n` +
          `• Category: ${s.category}\n` +
          `• Product: ${s.product?.name || "N/A"}\n` +
          `• Quantity: ${s.quantity}\n` +
          `• Payment: ${s.currency}\n\n` +
          `💰 Total amount: *${s.totalPrice.toFixed(2)}€*\n\n` +
          `✅ Confirm if everything is correct.`;

        return sendKeyboard(
          bot,
          id,
          summary,
          [[{ text: "✅ CONFIRM" }], [{ text: "🔙 Back" }]],
          userMessages
        );

      case 8:
        return sendKeyboard(
          bot,
          id,
          "❓ *Was the payment completed?*",
          [
            [{ text: "✅ CONFIRM" }],
            [{ text: "❌ Cancel payment" }]
          ],
          userMessages
        );

      default:
        userSessions[id] = { step: 1, createdAt: Date.now() };
        return renderStep(bot, id, 1, userMessages);
    }

  } catch (err) {
    console.error("❌ [renderStep error]:", err.message);
    return sendKeyboard(
      bot,
      id,
      "⚠️ Error displaying step.",
      [[{ text: "🔁 Try again" }]],
      userMessages
    );
  }
}
