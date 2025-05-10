// 📦 core/handlers/stepHandler.js | IMMORTAL FINAL v999999999 — ULTRA BULLETPROOF FLOW + FULL SYNC

import { deliveryMethods } from "../../config/features.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { userSessions } from "../../state/userState.js";
import { sendKeyboard, sendAndTrack } from "../../helpers/messageUtils.js";
import { punish } from "../../utils/punishUser.js";
import { handlePayment, handlePaymentConfirmation } from "./paymentHandler.js";
import { resetSession, safeStart } from "./finalHandler.js";

// 🌍 Region → City hierarchy
const regionMap = {
  "🗽 East Coast": ["New York", "Boston", "Philadelphia", "Baltimore", "Washington", "Charlotte"],
  "🌴 West Coast": ["Los Angeles", "San Diego", "San Jose", "San Francisco"],
  "🛢️ South": ["Houston", "Dallas", "Austin", "San Antonio", "Atlanta", "Miami", "El Paso", "Jacksonville", "Fort Worth", "Nashville", "Memphis"],
  "⛰️ Midwest": ["Chicago", "Detroit", "Indianapolis", "Columbus", "Louisville"],
  "🌲 Northwest": ["Seattle", "Portland", "Denver"],
  "🏜️ Southwest": ["Phoenix", "Las Vegas", "Oklahoma City"]
};

/**
 * 🧠 Handles dynamic user flow per step
 */
export async function handleStep(bot, id, text, userMessages) {
  const uid = String(id);
  const input = (text || "").trim();

  if (!input) return punish(bot, uid, userMessages);

  const s = (userSessions[uid] ||= { step: 1, createdAt: Date.now() });

  if (input === "🔙 Back") {
    try {
      if (s.step <= 1) {
        await resetSession(uid);
        return await safeStart(bot, uid);
      }

      s.step = Math.max(1, Math.floor(s.step - 1));
      if (s.step <= 1) {
        delete s.region;
        delete s.city;
      }
      return renderStep(bot, uid, s.step, userMessages);
    } catch (err) {
      console.error("❌ [Back error]:", err.message);
      return await safeStart(bot, uid);
    }
  }

  try {
    switch (s.step) {
      case 1:
        if (!regionMap[input]) return punish(bot, uid, userMessages);
        s.region = input;
        s.step = 1.2;
        return renderStep(bot, uid, s.step, userMessages);

      case 1.2:
        if (!regionMap[s.region]?.includes(input)) return punish(bot, uid, userMessages);
        s.city = input;
        s.step = 2;
        return renderStep(bot, uid, s.step, userMessages);

      case 2:
        const method = deliveryMethods.find(m => m.label === input);
        if (!method) return punish(bot, uid, userMessages);
        s.deliveryMethod = method.key;
        s.deliveryFee = method.fee;
        s.step = 3;
        return renderStep(bot, uid, s.step, userMessages);

      case 3:
        if (!products[input]) return punish(bot, uid, userMessages);
        s.category = input;
        s.step = 4;
        return renderStep(bot, uid, s.step, userMessages);

      case 4:
        const prod = products[s.category]?.find(p => p.name === input);
        if (!prod) return punish(bot, uid, userMessages);
        s.product = prod;
        s.step = 5;
        return renderStep(bot, uid, s.step, userMessages);

      case 5:
        const qty = input?.match(/^[^\s(]+/)?.[0];
        const price = s.product?.prices?.[qty];
        if (!price || isNaN(parseInt(qty))) return punish(bot, uid, userMessages);
        s.quantity = qty;
        s.unitPrice = price;
        s.totalPrice = price + s.deliveryFee;
        s.step = 6;
        return renderStep(bot, uid, s.step, userMessages);

      case 6:
        const wallet = WALLETS[input];
        if (!wallet || wallet.length < 8) return punish(bot, uid, userMessages);
        s.currency = input;
        s.wallet = wallet;
        s.step = 7;
        return renderStep(bot, uid, s.step, userMessages);

      case 7:
        if (input !== "✅ CONFIRM") return punish(bot, uid, userMessages);
        return await handlePayment(bot, uid, userMessages);

      case 8:
        if (input === "✅ CONFIRM") {
          s.step = 9;
          return await handlePaymentConfirmation(bot, uid, userMessages);
        }
        if (input === "❌ Cancel payment") {
          await sendAndTrack(bot, uid, "❌ Payment canceled. Returning to main menu...", {}, userMessages);
          await resetSession(uid);
          return setTimeout(() => safeStart(bot, uid), 300);
        }
        return punish(bot, uid, userMessages);

      default:
        console.warn(`⚠️ [Unknown step=${s.step}] for user ${uid}`);
        await resetSession(uid);
        return await safeStart(bot, uid);
    }
  } catch (err) {
    console.error("❌ [handleStep fatal]:", err.message);
    await resetSession(uid);
    return await safeStart(bot, uid);
  }
}

/**
 * 📲 UI rendering per step
 */
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
        return sendKeyboard(bot, id, `🏙 *Choose your city in ${s.region}:*`, [
          ...regionMap[s.region].map(c => [{ text: c }]),
          [{ text: "🔙 Back" }]
        ], userMessages);

      case 2:
        return sendKeyboard(bot, id, "🚚 *Choose delivery method:*", [
          ...deliveryMethods.map(m => [{ text: m.label }]),
          [{ text: "🔙 Back" }]
        ], userMessages);

      case 3:
        return sendKeyboard(bot, id, "📦 *Choose product category:*", [
          ...Object.keys(products).map(k => [{ text: k }]),
          [{ text: "🔙 Back" }]
        ], userMessages);

      case 4:
        return sendKeyboard(bot, id, "🧪 *Choose product:*", [
          ...products[s.category]?.map(p => [{ text: p.name }]),
          [{ text: "🔙 Back" }]
        ], userMessages);

      case 5:
        const qtyButtons = Object.entries(s.product?.prices || {}).map(([q, p]) => [{ text: `${q} (${p}$)` }]);
        qtyButtons.push([{ text: "🔙 Back" }]);
        return sendKeyboard(bot, id, "⚖️ *Choose quantity:*", qtyButtons, userMessages);

      case 6:
        const wallets = Object.keys(WALLETS).reduce((rows, key) => {
          const last = rows[rows.length - 1];
          if (last && last.length < 2) last.push({ text: key });
          else rows.push([{ text: key }]);
          return rows;
        }, []);
        wallets.push([{ text: "🔙 Back" }]);
        return sendKeyboard(bot, id, "💳 *Choose payment network:*", wallets, userMessages);

      case 7:
        return sendKeyboard(bot, id,
          `🧾 *Order summary:*\n\n` +
          `• City: ${s.city}\n` +
          `• Delivery: ${s.deliveryMethod} (${s.deliveryFee}$)\n` +
          `• Category: ${s.category}\n` +
          `• Product: ${s.product?.name}\n` +
          `• Quantity: ${s.quantity}\n` +
          `• Payment: ${s.currency}\n\n` +
          `💰 Total: *${s.totalPrice.toFixed(2)}$*\n\n✅ Confirm to proceed.`,
          [[{ text: "✅ CONFIRM" }], [{ text: "🔙 Back" }]],
          userMessages
        );

      case 8:
        return sendKeyboard(bot, id, "❓ *Was payment completed?*", [
          [{ text: "✅ CONFIRM" }],
          [{ text: "❌ Cancel payment" }]
        ], userMessages);

      default:
        console.warn(`⚠️ [renderStep fallback → 1] for ${id}`);
        userSessions[id] = { step: 1, createdAt: Date.now() };
        return renderStep(bot, id, 1, userMessages);
    }
  } catch (err) {
    console.error("❌ [renderStep error]:", err.message);
    return sendKeyboard(bot, id, "⚠️ Failed to load step. Try again.", [[{ text: "🔁 Try again" }]], userMessages);
  }
}
