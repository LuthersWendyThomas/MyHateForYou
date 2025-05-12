// 📦 core/handlers/renderStep.js | FINAL IMMORTAL v999999999∞
// FULLY SYNCED • BULLETPROOF • COMMENTED • 24/7 READY

import { REGION_MAP } from "../../config/regions.js";
import { deliveryMethods } from "../../config/features.js";
import { DISCOUNTS } from "../../config/discounts.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { sendKeyboard, sendAndTrack } from "../../helpers/messageUtils.js";
import { userSessions } from "../../state/userState.js";

export async function renderStep(bot, uid, step, userMessages) {
  const s = userSessions[uid];

  switch (step) {
    case 1: {
      const regions = Object.entries(REGION_MAP)
        .filter(([_, r]) => r.active)
        .map(([key]) => key);

      return sendKeyboard(bot, uid, "🌍 *Choose your region:*", regions, userMessages);
    }

    case 1.2: {
      const cities = Object.keys(REGION_MAP[s.region]?.cities || {})
        .map(city => REGION_MAP[s.region].cities[city] ? city : `🚫 ${city}`);

      return sendKeyboard(bot, uid, "🏙️ *Select your city:*", cities, userMessages);
    }

    case 2: {
      const options = deliveryMethods.map(m => m.label);
      return sendKeyboard(bot, uid, "🚚 *Choose delivery method:*", options, userMessages);
    }

    case 2.1: {
      return sendKeyboard(bot, uid, "🎟️ *Do you have a promo code?*", ["Yes", "No"], userMessages);
    }

    case 2.2: {
      return sendAndTrack(bot, uid, "🏷️ *Enter your promo code:*", { parse_mode: "Markdown" }, userMessages);
    }

    case 3: {
      const categories = Object.keys(products);
      return sendKeyboard(bot, uid, "📦 *Choose product category:*", categories, userMessages);
    }

    case 4: {
      const items = products[s.category]?.map(p => p.name) || [];
      return sendKeyboard(bot, uid, `🛍️ *Select product from ${s.category}:*`, items, userMessages);
    }

    case 5: {
      const priceOptions = s.product?.prices ? Object.entries(s.product.prices).map(
        ([qty, price]) => `${qty} (${price}€)`
      ) : [];

      return sendKeyboard(bot, uid, "🔢 *Choose quantity:*", priceOptions, userMessages);
    }

    case 6: {
      const currencies = Object.keys(WALLETS);
      return sendKeyboard(bot, uid, "💰 *Choose currency/wallet:*", currencies, userMessages);
    }

    case 7: {
      const summary = `🧾 *Order summary:*\n\n` +
        `📦 Product: *${s.product?.name}*\n` +
        `🔢 Quantity: *${s.quantity}*\n` +
        `💵 Unit Price: *${s.unitPrice}€*\n` +
        `🚚 Delivery Fee: *${s.deliveryFee}€*\n` +
        (s.promoCode ? `🏷️ Promo: *${s.promoCode}* (-${s.appliedDiscount}%)\n` : "") +
        `💳 Currency: *${s.currency}*\n\n` +
        `💸 *Total: ${s.totalPrice}€*\n\n` +
        `Press ✅ CONFIRM to proceed with payment.`;

      return sendKeyboard(bot, uid, summary, ["✅ CONFIRM", "🔙 Back"], userMessages, { parse_mode: "Markdown" });
    }

    case 8: {
      return sendKeyboard(bot, uid, "⏳ *Waiting for blockchain confirmation...*", ["✅ CONFIRM", "❌ Cancel payment"], userMessages, { parse_mode: "Markdown" });
    }

    default: {
      return sendAndTrack(bot, uid, "⚠️ Unknown step. Returning to start...", {}, userMessages);
    }
  }
}
