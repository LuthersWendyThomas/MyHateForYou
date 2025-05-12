// 📦 core/handlers/stepHandler.js | FINAL IMMORTAL v999999999999999.∞.4
// 24/7 BULLETPROOF • COMMENT RESTORED • SYNCED • UNTRIMMED • GODMODE∞

import { deliveryMethods } from "../../config/features.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { userSessions } from "../../state/userState.js";
import { sendKeyboard, sendAndTrack } from "../../helpers/messageUtils.js";
import { punish } from "../../utils/punishUser.js";
import { handlePayment, handlePaymentConfirmation } from "./paymentHandler.js";
import { resetSession, safeStart } from "./finalHandler.js";
import { REGION_MAP } from "../../config/regions.js";
import { resolveDiscount } from "../../config/discountUtils.js";
import { DISCOUNTS } from "../../config/discounts.js";

export async function handleStep(bot, id, text, userMessages) {
  const uid = String(id);
  const input = (text || "").trim();

  if (!input) return await punish(bot, uid, userMessages);

  const s = (userSessions[uid] ||= { step: 1, createdAt: Date.now() });

  // 🧭 Universal back button
  if (input === "🔙 Back" || input === "🖙 Back") {
    try {
      if (s.step <= 1) {
        await resetSession(uid);
        return await safeStart(bot, uid);
      }

      s.step = Math.max(1, s.step - 1);

      // 🧹 Reset key states if backing out of early step
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
    // 🔁 Step-by-step FSM logic
    switch (s.step) {
      case 1: {
        // 🌍 Region selection
        const region = REGION_MAP[input];
        if (!region?.active) return await punish(bot, uid, userMessages);

        s.region = input;
        s.step = 1.2;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 1.2: {
        // 🏙️ City selection
        const city = input.replace(/^🚫 /, "");
        if (!REGION_MAP[s.region]?.cities?.[city]) return await punish(bot, uid, userMessages);

        s.city = city;
        s.step = 2;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 2: {
        // 🚚 Delivery method selection
        const method = deliveryMethods.find(m => m.label === input);
        if (!method) return await punish(bot, uid, userMessages);

        s.deliveryMethod = method.key;
        s.deliveryFee = Number(method.fee) || 0;
        s.step = 2.1;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 2.1: {
        // 🎟️ Promo code decision
        if (input === "Yes") {
          s.step = 2.2;
          return renderStep(bot, uid, s.step, userMessages);
        }
        if (input === "No") {
          s.step = 3;
          return renderStep(bot, uid, s.step, userMessages);
        }

        return await punish(bot, uid, userMessages);
      }

      case 2.2: {
        // 🏷️ Promo code input
        const code = input.toUpperCase();
        const promo = DISCOUNTS.codes?.[code];

        if (!promo?.active) {
          await sendAndTrack(bot, uid, `❌ Invalid/inactive promo: \`${code}\``, { parse_mode: "Markdown" }, userMessages);
          s.step = 2.1;
          return renderStep(bot, uid, s.step, userMessages);
        }

        s.promoCode = code;
        const discountPercent = Number(promo.percentage) || 0;

        await sendAndTrack(bot, uid, `🏷️ Promo applied: *${code}* = ${discountPercent}%`, { parse_mode: "Markdown" }, userMessages);

        s.step = 3;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 3: {
        // 📦 Product category selection
        if (!products[input]) return await punish(bot, uid, userMessages);

        s.category = input;
        s.step = 4;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 4: {
        // ✅ Product selection
        const product = products[s.category]?.find(p => p.name === input);
        if (!product) return await punish(bot, uid, userMessages);

        s.product = product;
        s.step = 5;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 5: {
        // 🔢 Quantity selection and dynamic price calculation
        const qty = input.match(/^[^\s(]+/)?.[0];
        const basePrice = s.product?.prices?.[qty];

        if (!basePrice || isNaN(basePrice)) return await punish(bot, uid, userMessages);

        const discount = resolveDiscount({
          userId: uid,
          code: s.promoCode,
          region: s.region,
          city: s.city,
          category: s.category,
          productName: s.product.name
        }, DISCOUNTS);

        const finalPrice = +(basePrice - (basePrice * discount / 100));
        const total = +(finalPrice + s.deliveryFee).toFixed(2);

        s.quantity = qty;
        s.unitPrice = finalPrice;
        s.totalPrice = total;
        s.appliedDiscount = discount;

        s.step = 6;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 6: {
        // 💰 Wallet/currency choice
        const wallet = WALLETS[input];
        if (!wallet) return await punish(bot, uid, userMessages);

        s.currency = input;
        s.wallet = wallet;
        s.step = 7;
        return renderStep(bot, uid, s.step, userMessages);
      }

      case 7: {
        // ✅ Final confirmation before payment
        if (input !== "✅ CONFIRM") return await punish(bot, uid, userMessages);

        return await handlePayment(bot, uid, userMessages);
      }

      case 8: {
        // 💸 Waiting for blockchain confirmation
        if (input === "✅ CONFIRM") {
          s.step = 9;
          return await handlePaymentConfirmation(bot, uid, userMessages);
        }

        if (input === "❌ Cancel payment") {
          await sendAndTrack(bot, uid, "❌ Payment canceled. Returning to main menu...", {}, userMessages);
          await resetSession(uid);
          return setTimeout(() => safeStart(bot, uid), 300);
        }

        return await punish(bot, uid, userMessages);
      }

      default: {
        // 🧨 Safety fallback
        console.warn(`⚠️ Unknown step=${s.step} for ${uid}`);
        await resetSession(uid);
        return await safeStart(bot, uid);
      }
    }
  } catch (err) {
    console.error("❌ [handleStep fatal]:", err.message || err);
    await resetSession(uid);
    return await safeStart(bot, uid);
  }
}
