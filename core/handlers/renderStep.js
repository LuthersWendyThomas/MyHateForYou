// 📦 core/handlers/renderStep.js | FINAL IMMORTAL v999999999∞.GODMODE+SYNC
// FULLY SYNCHRONIZED • REGION/CITY/PRODUCT VALIDATION • TEXTLESS • ONLY PROMO INPUT • NO CRASH • 24/7 READY

import { REGION_MAP } from "../../config/regions.js";
import { deliveryMethods } from "../../config/features.js";
import { DISCOUNTS } from "../../config/discounts.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { sendKeyboard, sendAndTrack } from "../../helpers/messageUtils.js";
import { userSessions } from "../../state/userState.js";
import { MENU_BUTTONS } from "../../helpers/keyboardConstants.js";

/**
 * 🔁 Main step renderer (used by FSM)
 */
export async function renderStep(bot, uid, step, userMessages) {
  const session = userSessions[uid];
  validateSession(session);

  try {
    switch (step) {
      case 1: {
        // 🌍 Region selection
        const regions = Object.entries(REGION_MAP)
          .filter(([_, r]) => r?.active)
          .map(([label]) => ({ text: label }));

        return sendKeyboard(bot, uid, "🌍 *Choose your region:*", [...regions, { text: MENU_BUTTONS.BACK.text }], userMessages);
      }

      case 1.2: {
  // 🏙️ City selection
  const cities = REGION_MAP[session.region]?.cities || {};
  const options = Object.entries(cities).map(([city, isActive]) => {
    const label = isActive ? city : `🚫 ${city}`;
    return [{ text: label }];
  });

  options.push([{ text: MENU_BUTTONS.BACK.text }]); // Back button
  return sendKeyboard(bot, uid, "🏙️ *Select your city:*", options, userMessages);
}

      case 2: {
        // 🚚 Delivery method
        const methods = deliveryMethods.map((m) => ({ text: m.label }));

        return sendKeyboard(bot, uid, "🚚 *Choose delivery method:*", [...methods, { text: MENU_BUTTONS.BACK.text }], userMessages);
      }

      case 2.1: {
        // 🎟️ Promo code decision
        return sendKeyboard(bot, uid, "🎟️ *Do you have a promo code?*", [
          { text: MENU_BUTTONS.YES.text },
          { text: MENU_BUTTONS.NO.text },
          { text: MENU_BUTTONS.BACK.text },
        ], userMessages);
      }

      case 2.2: {
        // 🏷️ Promo code input (only place with raw text input)
        return sendAndTrack(bot, uid, "🏷️ *Enter your promo code:*", { parse_mode: "Markdown" }, userMessages);
      }

      case 3: {
        // 📦 Product category
        const options = Object.keys(products).map((cat) => ({ text: cat }));

        return sendKeyboard(bot, uid, "📦 *Choose product category:*", [...options, { text: MENU_BUTTONS.BACK.text }], userMessages);
      }

      case 4: {
        // 🛍️ Product selection
        const cat = session.category;
        const list = products[cat] || [];
        const buttons = list.map(p => p.active ? { text: p.name } : { text: `🚫 ${p.name}` });

        return sendKeyboard(bot, uid, `🛍️ *Select product from ${cat}:*`, [...buttons, { text: MENU_BUTTONS.BACK.text }], userMessages);
      }

      case 5: {
        // 🔢 Quantity selection
        const priceList = session.product?.prices || {};
        const buttons = Object.entries(priceList).map(([qty, price]) => ({ text: `${qty} (${price}€)` }));

        return sendKeyboard(bot, uid, "🔢 *Choose quantity:*", [...buttons, { text: MENU_BUTTONS.BACK.text }], userMessages);
      }

      case 6: {
        // 💰 Currency selection
        const currencies = Object.keys(WALLETS).map(cur => ({ text: cur }));

        return sendKeyboard(bot, uid, "💰 *Choose currency/wallet:*", [...currencies, { text: MENU_BUTTONS.BACK.text }], userMessages);
      }

      case 7: {
        // 🧾 Order summary
        const {
          product,
          quantity,
          unitPrice,
          deliveryFee,
          promoCode,
          appliedDiscount,
          currency,
          totalPrice,
        } = session;

        const summary =
          `🧾 *Order Summary:*\n\n` +
          `📦 Product: *${product?.name || "—"}*\n` +
          `🔢 Quantity: *${quantity || "—"}*\n` +
          `💵 Unit Price: *${unitPrice || 0}€*\n` +
          `🚚 Delivery Fee: *${deliveryFee || 0}€*\n` +
          (promoCode ? `🏷️ Promo: *${promoCode}* (-${appliedDiscount || 0}%)\n` : "") +
          `💳 Currency: *${currency || "—"}*\n\n` +
          `💸 *Total: ${totalPrice || 0}€*\n\n` +
          `✅ Press *CONFIRM* to proceed`;

        return sendKeyboard(bot, uid, summary, [
          { text: MENU_BUTTONS.CONFIRM.text },
          { text: MENU_BUTTONS.BACK.text }
        ], userMessages, { parse_mode: "Markdown" });
      }

      case 8: {
        // ⏳ Payment pending
        return sendKeyboard(bot, uid, "⏳ *Waiting for payment confirmation...*", [
          { text: MENU_BUTTONS.CONFIRM.text },
          { text: MENU_BUTTONS.CANCEL.text }
        ], userMessages, { parse_mode: "Markdown" });
      }

      default: {
        console.warn(`⚠️ Unknown step="${step}" for uid=${uid}`);
        return sendAndTrack(bot, uid, "⚠️ Unknown step. Returning to start...", {}, userMessages);
      }
    }
  } catch (err) {
    console.error("❌ [renderStep]:", err.message || err);
    return sendAndTrack(bot, uid, "❗️ Something went wrong. Please try again.", {}, userMessages);
  }
}

/**
 * 🛡️ Validates session existence
 */
function validateSession(session) {
  if (!session) throw new Error("⚠️ No valid session found.");
}
