// 🧠 core/handlers/stepHandler.js | IMMORTAL REGION UI v1.0 FINAL

import { deliveryMethods } from "../../config/features.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { userSessions } from "../../state/userState.js";
import { sendKeyboard, sendAndTrack } from "../../helpers/messageUtils.js";
import { punish } from "../../utils/punishUser.js";
import { handlePayment, handlePaymentConfirmation } from "./paymentHandler.js";
import { resetSession, safeStart } from "./finalHandler.js";
import { simulateDelivery } from "./deliveryHandler.js";

// 🌍 Grouped regions — FULL USA COVERAGE v2025.7
const regionMap = {
  "🗽 East Coast": [
    "New York", "Boston", "Philadelphia", "Baltimore", "Washington", "Charlotte"
  ],
  "🌴 West Coast": [
    "Los Angeles", "San Diego", "San Jose", "San Francisco"
  ],
  "🛢️ South": [
    "Houston", "Dallas", "Austin", "San Antonio", "Atlanta", "Miami", "El Paso",
    "Jacksonville", "Fort Worth", "Nashville", "Memphis"
  ],
  "⛰️ Midwest": [
    "Chicago", "Detroit", "Indianapolis", "Columbus", "Louisville"
  ],
  "🌲 Northwest": [
    "Seattle", "Portland", "Denver"
  ],
  "🏜️ Southwest": [
    "Phoenix", "Las Vegas", "Oklahoma City"
  ]
};

export async function handleStep(bot, id, text, userMessages) {
  const s = (userSessions[id] ||= { step: 1, createdAt: Date.now() });
  const input = text?.trim();

  if (!input || typeof input !== "string") {
    return await punish(bot, id, userMessages);
  }

  // 🔙 Back logic
  if (input === "🔙 Back") {
    if (s.step === 1) {
      // If we're in the first step (region selection), return to the start (greeting)
      await resetSession(id);
      return await safeStart(bot, id);
    } else if (s.step > 1) {
      s.step--;
      if (s.step === 1) delete s.region;
      if (s.step === 1.2) delete s.city;
      return renderStep(bot, id, s.step, userMessages);
    }
  }

  try {
    switch (s.step) {
      case 1:
        if (!regionMap[input]) return await punish(bot, id, userMessages);
        s.region = input;
        s.step = 1.2;
        return renderStep(bot, id, 1.2, userMessages);

      case 1.2:
        if (!regionMap[s.region]?.includes(input)) return await punish(bot, id, userMessages);
        s.city = input;
        s.step = 2;
        return renderStep(bot, id, 2, userMessages);

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
    if (step === 1) {
      return sendKeyboard(
        bot,
        id,
        "🗺 *Select your region:*",
        [
          ...Object.keys(regionMap).map(r => [{ text: r }]),
          [{ text: "🔙 Back" }]  // Add "Back" button here to go back to greeting
        ],
        userMessages
      );
    }

    if (step === 1.2) {
      return sendKeyboard(
        bot,
        id,
        `🏙 *Select your city in ${s.region}:*`,
        [
          ...regionMap[s.region].map(c => [{ text: c }]),
          [{ text: "🔙 Back" }]
        ],
        userMessages
      );
    }

    if (step === 2) {
      return sendKeyboard(
        bot,
        id,
        "🚛 *Choose delivery method:*",
        [
          ...deliveryMethods.map(m => [{ text: m.label }]),
          [{ text: "🔙 Back" }]
        ],
        userMessages
      );
    }

    if (step === 3) {
      return sendKeyboard(
        bot,
        id,
        "📋 *Select product category:*",
        [
          ...Object.keys(products).map(k => [{ text: k }]),
          [{ text: "🔙 Back" }]
        ],
        userMessages
      );
    }

    if (step === 4) {
      const cat = products[s.category] || [];
      return sendKeyboard(
        bot,
        id,
        "📦 *Choose a product:*",
        [
          ...cat.map(p => [{ text: p.name }]),
          [{ text: "🔙 Back" }]
        ],
        userMessages
      );
    }

    if (step === 5) {
      const qtyButtons = Object.entries(s.product?.prices || {}).map(([q, p]) => {
        return [{ text: `${q} (${p}$)` }];
      });

      qtyButtons.push([{ text: "🔙 Back" }]);

      return sendKeyboard(
        bot,
        id,
        "⚖️ *Select quantity:*",
        qtyButtons,
        userMessages
      );
    }

    if (step === 6) {
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
    }

    if (step === 7) {
      const summary = `📜 *Order summary:*\n\n` +
        `• City: ${s.city}\n` +
        `• Delivery: ${s.deliveryMethod} (${s.deliveryFee}$)\n` +
        `• Category: ${s.category}\n` +
        `• Product: ${s.product?.name || "N/A"}\n` +
        `• Quantity: ${s.quantity}\n` +
        `• Payment: ${s.currency}\n\n` +
        `💰 Total amount: *${s.totalPrice.toFixed(2)}$*\n\n` +
        `✅ Confirm if everything is correct.`;

      return sendKeyboard(
        bot,
        id,
        summary,
        [[{ text: "✅ CONFIRM" }], [{ text: "🔙 Back" }]],
        userMessages
      );
    }

    if (step === 8) {
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
    }

    // fallback
    userSessions[id] = { step: 1, createdAt: Date.now() };
    return renderStep(bot, id, 1, userMessages);
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
