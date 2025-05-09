// 🧠 core/handlers/stepHandler.js | IMMORTAL REGION UI v1.1 BULLETPROOF REBUILD

import { deliveryMethods } from "../../config/features.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { userSessions } from "../../state/userState.js";
import { sendKeyboard, sendAndTrack } from "../../helpers/messageUtils.js";
import { punish } from "../../utils/punishUser.js";
import { handlePayment, handlePaymentConfirmation } from "./paymentHandler.js";
import { resetSession, safeStart } from "./finalHandler.js";

// 🌍 Grouped regions — FULL USA COVERAGE v2025.7
const regionMap = {
  "🗽 East Coast": ["New York", "Boston", "Philadelphia", "Baltimore", "Washington", "Charlotte"],
  "🌴 West Coast": ["Los Angeles", "San Diego", "San Jose", "San Francisco"],
  "🛢️ South": ["Houston", "Dallas", "Austin", "San Antonio", "Atlanta", "Miami", "El Paso", "Jacksonville", "Fort Worth", "Nashville", "Memphis"],
  "⛰️ Midwest": ["Chicago", "Detroit", "Indianapolis", "Columbus", "Louisville"],
  "🌲 Northwest": ["Seattle", "Portland", "Denver"],
  "🏜️ Southwest": ["Phoenix", "Las Vegas", "Oklahoma City"]
};

export async function handleStep(bot, id, text, userMessages) {
  const s = (userSessions[id] ||= { step: 1, createdAt: Date.now() });
  const input = text?.trim();

  if (!input || typeof input !== "string") {
    return punish(bot, id, userMessages);
  }

  // 🔙 Back logic
  if (input === "🔙 Back") {
    try {
      if (s.step === 1) {
        await resetSession(id);
        return await safeStart(bot, id);
      } else {
        s.step--;
        if (s.step <= 1) {
          delete s.region;
          delete s.city;
        }
        return renderStep(bot, id, s.step, userMessages);
      }
    } catch (err) {
      console.error("❌ [Back logic error]:", err.message);
      return await safeStart(bot, id);
    }
  }

  try {
    switch (s.step) {
      case 1:
        if (!regionMap[input]) return punish(bot, id, userMessages);
        s.region = input;
        s.step = 1.2;
        return renderStep(bot, id, s.step, userMessages);

      case 1.2:
        if (!regionMap[s.region]?.includes(input)) return punish(bot, id, userMessages);
        s.city = input;
        s.step = 2;
        return renderStep(bot, id, s.step, userMessages);

      case 2:
        const method = deliveryMethods.find(m => m.label === input);
        if (!method) return punish(bot, id, userMessages);
        s.deliveryMethod = method.key;
        s.deliveryFee = method.fee;
        s.step = 3;
        return renderStep(bot, id, s.step, userMessages);

      case 3:
        if (!products[input]) return punish(bot, id, userMessages);
        s.category = input;
        s.step = 4;
        return renderStep(bot, id, s.step, userMessages);

      case 4:
        const prod = products[s.category]?.find(p => p.name === input);
        if (!prod || typeof prod !== "object") return punish(bot, id, userMessages);
        s.product = prod;
        s.step = 5;
        return renderStep(bot, id, s.step, userMessages);

      case 5:
        const qty = input?.match(/^[^\s(]+/)?.[0];
        const price = s.product?.prices?.[qty];
        if (!price || isNaN(parseInt(qty))) return punish(bot, id, userMessages);
        s.quantity = qty;
        s.unitPrice = price;
        s.totalPrice = price + s.deliveryFee;
        s.step = 6;
        return renderStep(bot, id, s.step, userMessages);

      case 6:
        const wallet = WALLETS[input];
        if (!wallet || typeof wallet !== "string" || wallet.length < 8) return punish(bot, id, userMessages);
        s.currency = input;
        s.wallet = wallet;
        s.step = 7;
        return renderStep(bot, id, s.step, userMessages);

      case 7:
        if (input !== "✅ CONFIRM") return punish(bot, id, userMessages);
        return await handlePayment(bot, id, userMessages);

      case 8:
        if (input === "✅ CONFIRM") {
          s.step = 9;
          return await handlePaymentConfirmation(bot, id, userMessages);
        }
        if (input === "❌ Cancel payment") {
          await sendAndTrack(bot, id, "❌ Payment cancelled. Returning to the start.", {}, userMessages);
          await resetSession(id);
          setTimeout(async () => await safeStart(bot, id), 250);
          return;
        }
        return punish(bot, id, userMessages);

      default:
        console.warn(`⚠️ [Unknown step=${s.step}] — resetting user ${id}`);
        await resetSession(id);
        return await safeStart(bot, id);
    }
  } catch (err) {
    console.error("❌ [handleStep fatal error]:", err.message);
    await resetSession(id);
    return await safeStart(bot, id);
  }
}

function renderStep(bot, id, step, userMessages) {
  const s = userSessions[id] ||= { step: 1 };

  try {
    switch (step) {
      case 1:
        return sendKeyboard(bot, id, "🗺 *Select your region:*", [
          ...Object.keys(regionMap).map(r => [{ text: r }]),
          [{ text: "🔙 Back" }]
        ], userMessages);

      case 1.2:
        return sendKeyboard(bot, id, `🏙 *Select your city in ${s.region}:*`, [
          ...regionMap[s.region].map(c => [{ text: c }]),
          [{ text: "🔙 Back" }]
        ], userMessages);

      case 2:
        return sendKeyboard(bot, id, "🚛 *Choose delivery method:*", [
          ...deliveryMethods.map(m => [{ text: m.label }]),
          [{ text: "🔙 Back" }]
        ], userMessages);

      case 3:
        return sendKeyboard(bot, id, "📋 *Select product category:*", [
          ...Object.keys(products).map(k => [{ text: k }]),
          [{ text: "🔙 Back" }]
        ], userMessages);

      case 4:
        return sendKeyboard(bot, id, "📦 *Choose a product:*", [
          ...products[s.category]?.map(p => [{ text: p.name }]),
          [{ text: "🔙 Back" }]
        ], userMessages);

      case 5:
        const qtyButtons = Object.entries(s.product?.prices || {}).map(([q, p]) => [{ text: `${q} (${p}$)` }]);
        qtyButtons.push([{ text: "🔙 Back" }]);
        return sendKeyboard(bot, id, "⚖️ *Select quantity:*", qtyButtons, userMessages);

      case 6:
        const networks = Object.keys(WALLETS).reduce((rows, key) => {
          const last = rows[rows.length - 1];
          if (last && last.length < 2) last.push({ text: key });
          else rows.push([{ text: key }]);
          return rows;
        }, []);
        networks.push([{ text: "🔙 Back" }]);
        return sendKeyboard(bot, id, "💳 *Select payment network:*", networks, userMessages);

      case 7:
        return sendKeyboard(bot, id,
          `📜 *Order summary:*\n\n` +
          `• City: ${s.city}\n` +
          `• Delivery: ${s.deliveryMethod} (${s.deliveryFee}$)\n` +
          `• Category: ${s.category}\n` +
          `• Product: ${s.product?.name}\n` +
          `• Quantity: ${s.quantity}\n` +
          `• Payment: ${s.currency}\n\n` +
          `💰 Total: *${s.totalPrice.toFixed(2)}$*\n\n` +
          `✅ Confirm if everything is correct.`,
          [[{ text: "✅ CONFIRM" }], [{ text: "🔙 Back" }]],
          userMessages
        );

      case 8:
        return sendKeyboard(bot, id, "❓ *Was the payment completed?*", [
          [{ text: "✅ CONFIRM" }],
          [{ text: "❌ Cancel payment" }]
        ], userMessages);

      default:
        userSessions[id] = { step: 1, createdAt: Date.now() };
        return renderStep(bot, id, 1, userMessages);
    }
  } catch (err) {
    console.error("❌ [renderStep error]:", err.message);
    return sendKeyboard(bot, id, "⚠️ Error displaying step.", [[{ text: "🔁 Try again" }]], userMessages);
  }
}
