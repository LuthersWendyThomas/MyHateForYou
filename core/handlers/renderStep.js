// 📦 core/handlers/renderStep.js | FINAL IMMORTAL v999999999∞+ULTIMATE
// FULLY SYNCED • BULLETPROOF • COMMENTED • 24/7 READY • MAXIMUM UPGRADE

import { REGION_MAP } from "../../config/regions.js";
import { deliveryMethods } from "../../config/features.js";
import { DISCOUNTS } from "../../config/discounts.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { sendKeyboard, sendAndTrack } from "../../helpers/messageUtils.js";
import { userSessions } from "../../state/userState.js";
import { MENU_BUTTONS } from "../../helpers/keyboardConstants.js";

/**
 * Renders the appropriate step UI for the user.
 * @param {object} bot - Telegram bot instance
 * @param {string|number} uid - User ID
 * @param {number} step - Current workflow step
 * @param {object} userMessages - Message tracking object
 */
export async function renderStep(bot, uid, step, userMessages) {
  const session = userSessions[uid];

  try {
    switch (step) {
      case 1: {
        // 🌍 Region selection
        const regions = Object.entries(REGION_MAP)
          .filter(([_, region]) => region.active)
          .map(([key]) => key);

        return await sendKeyboard(bot, uid, "🌍 *Choose your region:*", regions, userMessages);
      }

      case 1.2: {
        // 🏙️ City selection
        const cities = Object.keys(REGION_MAP[session.region]?.cities || {})
          .map(city => REGION_MAP[session.region].cities[city] ? city : `🚫 ${city}`);
        
        return await sendKeyboard(bot, uid, "🏙️ *Select your city:*", [...cities, MENU_BUTTONS.BACK.text], userMessages);
      }

      case 2: {
        // 🚚 Delivery method
        const options = deliveryMethods.map(method => method.label);

        return await sendKeyboard(bot, uid, "🚚 *Choose delivery method:*", [...options, MENU_BUTTONS.BACK.text], userMessages);
      }

      case 2.1: {
        // 🎟️ Promo code decision
        return await sendKeyboard(bot, uid, "🎟️ *Do you have a promo code?*", [MENU_BUTTONS.YES.text, MENU_BUTTONS.NO.text, MENU_BUTTONS.BACK.text], userMessages);
      }

      case 2.2: {
        // 🏷️ Promo code input
        return await sendAndTrack(bot, uid, "🏷️ *Enter your promo code:*", { parse_mode: "Markdown" }, userMessages);
      }

      case 3: {
        // 📦 Product category
        const categories = Object.keys(products);

        return await sendKeyboard(bot, uid, "📦 *Choose product category:*", [...categories, MENU_BUTTONS.BACK.text], userMessages);
      }

      case 4: {
        // 🛍️ Product selection
        const items = products[session.category]?.map(product => product.name) || [];

        return await sendKeyboard(bot, uid, `🛍️ *Select product from ${session.category}:*`, [...items, MENU_BUTTONS.BACK.text], userMessages);
      }

      case 5: {
        // 🔢 Quantity & pricing
        const priceOptions = session.product?.prices 
          ? Object.entries(session.product.prices).map(([qty, price]) => `${qty} (${price}€)`) 
          : [];

        return await sendKeyboard(bot, uid, "🔢 *Choose quantity:*", [...priceOptions, MENU_BUTTONS.BACK.text], userMessages);
      }

      case 6: {
        // 💰 Wallet/currency selection
        const currencies = Object.keys(WALLETS);

        return await sendKeyboard(bot, uid, "💰 *Choose currency/wallet:*", [...currencies, MENU_BUTTONS.BACK.text], userMessages);
      }

      case 7: {
        // 🧾 Order summary
        const summary = `🧾 *Order summary:*\n\n` +
          `📦 Product: *${session.product?.name || "Not selected"}*\n` +
          `🔢 Quantity: *${session.quantity || "Not selected"}*\n` +
          `💵 Unit Price: *${session.unitPrice || 0}€*\n` +
          `🚚 Delivery Fee: *${session.deliveryFee || 0}€*\n` +
          (session.promoCode ? `🏷️ Promo: *${session.promoCode}* (-${session.appliedDiscount || 0}%)\n` : "") +
          `💳 Currency: *${session.currency || "Not selected"}*\n\n` +
          `💸 *Total: ${session.totalPrice || 0}€*\n\n` +
          `Press ✅ CONFIRM to proceed with payment.`;

        return await sendKeyboard(
          bot,
          uid,
          summary,
          [MENU_BUTTONS.CONFIRM.text, MENU_BUTTONS.BACK.text],
          userMessages,
          { parse_mode: "Markdown" }
        );
      }

      case 8: {
        // ⏳ Blockchain confirmation
        return await sendKeyboard(
          bot,
          uid,
          "⏳ *Waiting for blockchain confirmation...*",
          [MENU_BUTTONS.CONFIRM.text, MENU_BUTTONS.CANCEL.text],
          userMessages,
          { parse_mode: "Markdown" }
        );
      }

      default: {
        // 🧨 Fallback for unknown steps
        console.warn(`⚠️ Unknown step=${step} for uid=${uid}`);
        return await sendAndTrack(bot, uid, "⚠️ Unknown step. Returning to start...", {}, userMessages);
      }
    }
  } catch (err) {
    console.error("❌ [renderStep error]:", err.message || err);
    return await sendAndTrack(bot, uid, "❗️ An error occurred. Please try again.", {}, userMessages);
  }
}

/**
 * ✅ Centralized fallback for invalid sessions
 * @param {object} session - User session object
 */
function validateSession(session) {
  if (!session) throw new Error("Session is undefined or invalid.");
}
