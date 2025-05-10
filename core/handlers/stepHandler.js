// 📦 core/handlers/stepHandler.js | FINAL IMMORTAL v999999999 — REGION-SYNCED DIAMOND BUILD + DISCOUNT SYNC

import { deliveryMethods } from "../../config/features.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { userSessions } from "../../state/userState.js";
import { sendKeyboard, sendAndTrack } from "../../helpers/messageUtils.js";
import { punish } from "../../utils/punishUser.js";
import { handlePayment, handlePaymentConfirmation } from "./paymentHandler.js";
import { resetSession, safeStart } from "./finalHandler.js";
import { REGION_MAP, getRegionKeyboard, getCityKeyboard } from "../../config/regions.js";
import { resolveDiscount } from "../../config/discounts.js";

export async function handleStep(bot, id, text, userMessages) {
  const uid = String(id);
  const input = (text || "").trim();

  if (!input) return punish(bot, uid, userMessages);

  const s = (userSessions[uid] ||= { step: 1, createdAt: Date.now() });

  if (input === "🖙 Back") {
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
      case 1: {
        if (!REGION_MAP[input]?.active) return punish(bot, uid, userMessages);
        s.region = input;
        s.step = 1.2;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 1.2: {
        const selectedCity = input.replace(/^\uD83D\uDEAB /, "");
        const cities = REGION_MAP[s.region]?.cities;
        if (!cities || !cities[selectedCity]) return punish(bot, uid, userMessages);
        s.city = selectedCity;
        s.step = 2;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 2: {
        const method = deliveryMethods.find(m => m.label === input);
        if (!method) return punish(bot, uid, userMessages);
        s.deliveryMethod = method.key;
        s.deliveryFee = method.fee;
        s.step = 3;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 3:
        if (!products[input]) return punish(bot, uid, userMessages);
        s.category = input;
        s.step = 4;
        return renderStep(bot, uid, s.step, userMessages);

      case 4: {
        const prod = products[s.category]?.find(p => p.name === input);
        if (!prod) return punish(bot, uid, userMessages);
        s.product = prod;
        s.step = 5;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 5: {
        const qty = input?.match(/^[^\s(]+/)?.[0];
        const basePrice = s.product?.prices?.[qty];
        if (!basePrice || isNaN(parseInt(qty))) return punish(bot, uid, userMessages);

        const discount = resolveDiscount({
          userId: uid,
          city: s.city,
          category: s.category,
          productName: s.product?.name
        });

        const discountedPrice = basePrice - (basePrice * discount / 100);

        s.quantity = qty;
        s.unitPrice = discountedPrice;
        s.totalPrice = discountedPrice + s.deliveryFee;
        s.step = 6;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 6: {
        const wallet = WALLETS[input];
        if (!wallet || wallet.length < 8) return punish(bot, uid, userMessages);
        s.currency = input;
        s.wallet = wallet;
        s.step = 7;
        return renderStep(bot, uid, s.step, userMessages);
      }

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

function renderStep(bot, id, step, userMessages) {
  const s = userSessions[id] ||= { step: 1 };

  try {
    switch (step) {
      case 1:
        return sendKeyboard(bot, id, "📜 *Select your region:*", getRegionKeyboard(), userMessages);

      case 1.2:
        return sendKeyboard(bot, id, `🏩 *Choose your city in ${s.region}:*`, getCityKeyboard(s.region), userMessages);

      case 2:
        return sendKeyboard(bot, id, "🚚 *Choose delivery method:*", [
          ...deliveryMethods.map(m => [{ text: m.label }]),
          [{ text: "🖙 Back" }]
        ], userMessages);

      case 3:
        return sendKeyboard(bot, id, "📦 *Choose product category:*", [
          ...Object.keys(products).map(k => [{ text: k }]),
          [{ text: "🖙 Back" }]
        ], userMessages);

      case 4:
        return sendKeyboard(bot, id, "🥪 *Choose product:*", [
          ...products[s.category]?.map(p => [{ text: p.name }]),
          [{ text: "🖙 Back" }]
        ], userMessages);

      case 5:
        const qtyButtons = Object.entries(s.product?.prices || {}).map(([q, p]) => [{ text: `${q} (${p}$)` }]);
        qtyButtons.push([{ text: "🖙 Back" }]);
        return sendKeyboard(bot, id, "⚖️ *Choose quantity:*", qtyButtons, userMessages);

      case 6:
        const wallets = Object.keys(WALLETS).reduce((rows, key) => {
          const last = rows[rows.length - 1];
          if (last && last.length < 2) last.push({ text: key });
          else rows.push([{ text: key }]);
          return rows;
        }, []);
        wallets.push([{ text: "🖙 Back" }]);
        return sendKeyboard(bot, id, "💳 *Choose payment network:*", wallets, userMessages);

      case 7:
        return sendKeyboard(bot, id,
          `🧾 *Order summary:*

• City: ${s.city}
• Delivery: ${s.deliveryMethod} (${s.deliveryFee}$)
• Category: ${s.category}
• Product: ${s.product?.name}
• Quantity: ${s.quantity}
• Payment: ${s.currency}

💰 Total: *${s.totalPrice.toFixed(2)}$*

✅ Confirm to proceed.`,
          [[{ text: "✅ CONFIRM" }], [{ text: "🖙 Back" }]],
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
