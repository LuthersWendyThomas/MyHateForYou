// 📦 core/handlers/stepHandler.js | IMMORTAL FINAL v3.∞
// REGION SYNC + PROMOCODE + DISCOUNT READY + WALLET SELECTOR + DELIVERY LOGIC POLISHED

import { deliveryMethods } from "../../config/features.js";
import { WALLETS } from "../../config/config.js";
import { products, allCategories } from "../../config/products.js";
import { userSessions } from "../../state/userState.js";
import { sendKeyboard, sendAndTrack } from "../../helpers/messageUtils.js";
import { punish } from "../../utils/punishUser.js";
import { handlePayment, handlePaymentConfirmation } from "./paymentHandler.js";
import { resetSession, safeStart } from "./finalHandler.js";
import { REGION_MAP, getRegionKeyboard, getCityKeyboard } from "../../config/regions.js";
import { resolveDiscount, DISCOUNTS } from "../../config/discounts.js";

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
      s.step = Math.max(1, s.step - 1);
      if (s.step <= 1) {
        delete s.region;
        delete s.city;
        delete s.promoCode;
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
        if (!REGION_MAP[input]?.active) return punish(bot, uid, userMessages);
        s.region = input;
        s.step = 1.2;
        return renderStep(bot, uid, s.step, userMessages);

      case 1.2: {
        const city = input.replace(/^🚫 /, "");
        if (!REGION_MAP[s.region]?.cities?.[city]) return punish(bot, uid, userMessages);
        s.city = city;
        s.step = 2;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 2: {
        const method = deliveryMethods.find(m => m.label === input);
        if (!method) return punish(bot, uid, userMessages);
        s.deliveryMethod = method.key;
        s.deliveryFee = method.fee;
        s.step = 2.1;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 2.1:
        if (input === "Yes") {
          s.step = 2.2;
          return renderStep(bot, uid, s.step, userMessages);
        }
        if (input === "No") {
          s.step = 3;
          return renderStep(bot, uid, s.step, userMessages);
        }
        return punish(bot, uid, userMessages);

      case 2.2: {
        const code = input.toUpperCase();
        const promo = DISCOUNTS.codes?.[code];
        if (!promo || !promo.active) {
          await sendAndTrack(bot, uid, `❌ Promo code invalid or inactive: \`${code}\``, { parse_mode: "Markdown" }, userMessages);
          s.step = 2.1;
          return renderStep(bot, uid, s.step, userMessages);
        }
        s.promoCode = code;
        await sendAndTrack(bot, uid, `🏷️ Promo code applied: *${code}* = ${promo.percentage}%`, { parse_mode: "Markdown" }, userMessages);
        s.step = 3;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 3:
        if (!products[input]) return punish(bot, uid, userMessages);
        s.category = input;
        s.step = 4;
        return renderStep(bot, uid, s.step, userMessages);

      case 4:
        const product = products[s.category]?.find(p => p.name === input);
        if (!product) return punish(bot, uid, userMessages);
        s.product = product;
        s.step = 5;
        return renderStep(bot, uid, s.step, userMessages);

      case 5: {
        const qty = input.match(/^[^\s(]+/)?.[0];
        const price = s.product?.prices?.[qty];
        if (!price || isNaN(price)) return punish(bot, uid, userMessages);

        const discount = resolveDiscount({
          userId: uid,
          code: s.promoCode,
          region: s.region,
          city: s.city,
          category: s.category,
          productName: s.product.name
        });

        const finalPrice = price - (price * discount / 100);
        s.quantity = qty;
        s.unitPrice = finalPrice;
        s.totalPrice = finalPrice + s.deliveryFee;
        s.appliedDiscount = discount;
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
        console.warn(`⚠️ Unknown step=${s.step} for user ${uid}`);
        await resetSession(uid);
        return await safeStart(bot, uid);
    }
  } catch (err) {
    console.error("❌ [handleStep fatal]:", err.message || err);
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

      case 2.1:
        return sendKeyboard(bot, id, "🏷️ *Do you have a promo code?*", [[{ text: "Yes" }, { text: "No" }]], userMessages);

      case 2.2:
        return sendKeyboard(bot, id, "🏷️ *Enter your promo code:*", [[{ text: "🖙 Back" }]], userMessages);

      case 3:
        return sendKeyboard(bot, id, "📦 *Choose product category:*", [
          ...allCategories.map(c => [{ text: c }]),
          [{ text: "🖙 Back" }]
        ], userMessages);

      case 4:
        return sendKeyboard(bot, id, "🥪 *Choose product:*", [
          ...products[s.category].map(p => [{ text: p.name }]),
          [{ text: "🖙 Back" }]
        ], userMessages);

      case 5:
        const qtyButtons = Object.entries(s.product.prices).map(([qty, price]) => [{ text: `${qty} (${price}$)` }]);
        qtyButtons.push([{ text: "🖙 Back" }]);
        return sendKeyboard(bot, id, "⚖️ *Choose quantity:*", qtyButtons, userMessages);

      case 6:
        const walletButtons = Object.keys(WALLETS).reduce((acc, curr) => {
          const last = acc[acc.length - 1];
          if (last && last.length < 2) last.push({ text: curr });
          else acc.push([{ text: curr }]);
          return acc;
        }, []);
        walletButtons.push([{ text: "🖙 Back" }]);
        return sendKeyboard(bot, id, "💳 *Choose payment network:*", walletButtons, userMessages);

      case 7:
        const discountInfo = s.promoCode ? `🏷️ Promo: *${s.promoCode}* — ${s.appliedDiscount}%\n` : "🏷️ Promo: None\n";
        return sendKeyboard(bot, id,
          `🧾 *Order summary:*

• Region: ${s.region}
• City: ${s.city}
• Delivery: ${s.deliveryMethod} (${s.deliveryFee}$)
• Category: ${s.category}
• Product: ${s.product.name}
• Quantity: ${s.quantity}
• Payment: ${s.currency}

${discountInfo}💰 Total: *${s.totalPrice.toFixed(2)}$*

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
        return renderStep(bot, id, 1, userMessages);
    }
  } catch (err) {
    console.error("❌ [renderStep error]:", err.message || err);
    return sendKeyboard(bot, id, "⚠️ Failed to load step. Try again.", [[{ text: "🔁 Try again" }]], userMessages);
  }
}
