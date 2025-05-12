// 📦 core/handlers/renderStep.js | FINAL IMMORTAL v999999999∞+1
// FULLY SYNCED • BULLETPROOF • COMMENTED • 24/7 READY

import { REGION_MAP } from "../../config/regions.js";
import { deliveryMethods } from "../../config/features.js";
import { DISCOUNTS } from "../../config/discounts.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { sendKeyboard, sendAndTrack } from "../../helpers/messageUtils.js";
import { userSessions } from "../../state/userState.js";

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
        
        return await sendKeyboard(bot, uid, "🏙️ *Select your city:*", cities, userMessages);
      }

      case 2: {
        // 🚚 Delivery method
        const options = deliveryMethods.map(method => method.label);

        return await sendKeyboard(bot, uid, "🚚 *Choose delivery method:*", options, userMessages);
      }

      case 2.1: {
        // 🎟️ Promo code decision
        return await sendKeyboard(bot, uid, "🎟️ *Do you have a promo code?*", ["Yes", "No"], userMessages);
      }

      case 2.2: {
        // 🏷️ Promo code input
        return await sendAndTrack(bot, uid, "🏷️ *Enter your promo code:*", { parse_mode: "Markdown" }, userMessages);
      }

      case 3: {
        // 📦 Product category
        const categories = Object.keys(products);

        return await sendKeyboard(bot, uid, "📦 *Choose product category:*", categories, userMessages);
      }

      case 4: {
        // 🛍️ Product selection
        const items = products[session.category]?.map(product => product.name) || [];

        return await sendKeyboard(bot, uid, `🛍️ *Select product from ${session.category}:*`, items, userMessages);
      }

      case 5: {
        // 🔢 Quantity & pricing
        const priceOptions = session.product?.prices 
          ? Object.entries(session.product.prices).map(([qty, price]) => `${qty} (${price}€)`) 
          : [];

        return await sendKeyboard(bot, uid, "🔢 *Choose quantity:*", priceOptions, userMessages);
      }

      case 6: {
        // 💰 Wallet/currency selection
        const currencies = Object.keys(WALLETS);

        return await sendKeyboard(bot, uid, "💰 *Choose currency/wallet:*", currencies, userMessages);
      }

      case 7: {
        // 🧾 Order summary
        const summary = `🧾 *Order summary:*\n\n` +
          `📦 Product: *${session.product?.name}*\n` +
          `🔢 Quantity: *${session.quantity}*\n` +
          `💵 Unit Price: *${session.unitPrice}€*\n` +
          `🚚 Delivery Fee: *${session.deliveryFee}€*\n` +
          (session.promoCode ? `🏷️ Promo: *${session.promoCode}* (-${session.appliedDiscount}%)\n` : "") +
          `💳 Currency: *${session.currency}*\n\n` +
          `💸 *Total: ${session.totalPrice}€*\n\n` +
          `Press ✅ CONFIRM to proceed with payment.`;

        return await sendKeyboard(
          bot,
          uid,
          summary,
          ["✅ CONFIRM", "🔙 Back"],
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
          ["✅ CONFIRM", "❌ Cancel payment"],
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
