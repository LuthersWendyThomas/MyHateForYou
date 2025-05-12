// 📦 core/handlers/stepHandler.js | IMMORTAL FINAL v1.0.1•ULTIMATE.GODMODE+SYNC+DIAMONDLOCK
// 24/7 BULLETPROOF • INLINE FSM • DIAMOND SAFE • FULL USD SUPPORT

import { deliveryMethods } from "../../config/features.js";
import { WALLETS }        from "../../config/config.js";
import { products }       from "../../config/products.js";
import { userSessions, isValidStep } from "../../state/userState.js";
import { sendAndTrack, sendKeyboard } from "../../helpers/messageUtils.js";
import { handlePayment, handlePaymentConfirmation } from "./paymentHandler.js";
import { resetSession, safeStart }    from "./finalHandler.js";
import { REGION_MAP, getRegionKeyboard, getCityKeyboard } from "../../config/regions.js";
import { resolveDiscount } from "../../config/discountUtils.js";
import { DISCOUNTS }       from "../../config/discounts.js";
import { MENU_BUTTONS }    from "../../helpers/keyboardConstants.js";

/**
 * 🔁 Renders the given FSM step
 */
async function renderStep(bot, uid, step, userMessages) {
  const session = userSessions[uid];
  if (!session) throw new Error("⚠️ No session");

  try {
    switch (step) {
      case 1: {
        // 🌍 Region selector
        const keyboard = getRegionKeyboard();
        return sendKeyboard(
          bot, uid,
          "🌍 *Choose your region:*",
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 1.2: {
        // 🏙️ City selector
        const keyboard = getCityKeyboard(session.region);
        return sendKeyboard(
          bot, uid,
          "🏙️ *Select your city:*",
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 2: {
        // 🚚 Delivery method
        const keyboard = deliveryMethods.map(m => [{ text: m.label }]);
        keyboard.push([{ text: MENU_BUTTONS.BACK.text }]);
        return sendKeyboard(
          bot, uid,
          "🚚 *Choose delivery method:*",
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 2.1: {
        // 🎁 Promo decision
        return sendKeyboard(
          bot, uid,
          "🎁 *Have a promo code?*",
          [
            [{ text: MENU_BUTTONS.YES.text }],
            [{ text: MENU_BUTTONS.NO.text }],
            [{ text: MENU_BUTTONS.BACK.text }]
          ],
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 2.2: {
        // 🏷️ Enter promo
        return sendKeyboard(
          bot, uid,
          "🏷️ *Enter your promo code:*",
          [[{ text: MENU_BUTTONS.BACK.text }]],
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 3: {
        // 📦 Category
        const keyboard = Object.keys(products).map(c => [{ text: c }]);
        keyboard.push([{ text: MENU_BUTTONS.BACK.text }]);
        return sendKeyboard(
          bot, uid,
          "📦 *Choose product category:*",
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 4: {
        // 🛍️ Product
        const list = products[session.category] || [];
        const keyboard = list.map(p => [
          { text: p.active ? p.name : `🚫 ${p.name}` }
        ]);
        keyboard.push([{ text: MENU_BUTTONS.BACK.text }]);
        return sendKeyboard(
          bot, uid,
          `🛍️ *Select product from ${session.category}:*`,
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 5: {
        // 🔢 Quantity
        const priceList = session.product?.prices || {};
        const keyboard = Object.entries(priceList).map(
          ([qty, price]) => [{ text: `${qty} ($${price})` }]
        );
        keyboard.push([{ text: MENU_BUTTONS.BACK.text }]);
        return sendKeyboard(
          bot, uid,
          "🔢 *Choose quantity:*",
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 6: {
        // 💰 Currency/wallet
        const keyboard = Object.keys(WALLETS).map(c => [{ text: c }]);
        keyboard.push([{ text: MENU_BUTTONS.BACK.text }]);
        return sendKeyboard(
          bot, uid,
          "💰 *Choose currency/wallet:*",
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 7: {
        // 🧾 Order summary
        const {
          product, quantity, unitPrice, deliveryFee,
          promoCode, appliedDiscount, currency, totalPrice
        } = session;
        const summary =
          `🧾 *Order Summary:*\n\n` +
          `📦 Product: *${product?.name || "—"}*\n` +
          `🔢 Quantity: *${quantity || "—"}*\n` +
          `💵 Unit Price: *$${unitPrice || 0}*\n` +
          `🚚 Delivery Fee: *$${deliveryFee || 0}*\n` +
          (promoCode
            ? `🏷️ Promo: *${promoCode}* (-${appliedDiscount || 0}%)\n`
            : ""
          ) +
          `💳 Currency: *${currency || "—"}*\n\n` +
          `💸 *Total: $${totalPrice || 0}*\n\n` +
          `✅ Press *${MENU_BUTTONS.CONFIRM.text}* to proceed`;
        return sendKeyboard(
          bot, uid,
          summary,
          [
            [{ text: MENU_BUTTONS.CONFIRM.text }],
            [{ text: MENU_BUTTONS.BACK.text }]
          ],
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 8: {
        // ⏳ Waiting payment
        return sendKeyboard(
          bot, uid,
          "⏳ *Waiting for payment...*",
          [
            [{ text: MENU_BUTTONS.CONFIRM.text }],
            [{ text: MENU_BUTTONS.CANCEL.text }]
          ],
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      default: {
        console.warn(`⚠️ renderStep unknown step=${step}`, uid);
        return sendAndTrack(
          bot, uid,
          "⚠️ Unexpected step. Returning to start...",
          {},
          userMessages
        );
      }
    }
  } catch (err) {
    console.error("❌ [renderStep error]:", err);
    return sendAndTrack(
      bot, uid,
      "❗️ Something went wrong. Try again.",
      {},
      userMessages
    );
  }
}

export async function handleStep(bot, id, text, userMessages) {
  const uid   = sanitizeId(id);
  const input = normalizeText(text);

  if (!input) {
    const step = userSessions[uid]?.step || 1;
    return renderStep(bot, uid, step, userMessages);
  }

  // ensure session exists
  if (!userSessions[uid]) userSessions[uid] = { step: 1, createdAt: Date.now() };
  if (!isValidStep(userSessions[uid].step)) userSessions[uid].step = 1;
  const session = userSessions[uid];

  // BACK button
  if (input === MENU_BUTTONS.BACK.text.toLowerCase()) {
    return handleBackButton(bot, uid, session, userMessages);
  }

  try {
    switch (session.step) {
      case 1:   return handleRegion(bot, uid, input, session, userMessages);
      case 1.2: return handleCity(bot,   uid, input, session, userMessages);
      case 2:   return handleDelivery(bot, uid, input, session, userMessages);
      case 2.1: return handlePromoDecision(bot, uid, input, session, userMessages);
      case 2.2: return handlePromoCode(bot, uid, text,   session, userMessages);
      case 3:   return handleCategory(bot, uid, input, session, userMessages);
      case 4:   return handleProduct(bot, uid, input, session, userMessages);
      case 5:   return handleQuantity(bot, uid, input, session, userMessages);
      case 6:   return handleCurrency(bot, uid, input, session, userMessages);
      case 7:   return handleOrderConfirm(bot, uid, input, session, userMessages);
      case 8:   return handleConfirmOrCancel(bot, uid, input, session, userMessages);
      default:
        await resetSession(uid);
        return safeStart(bot, uid);
    }
  } catch (err) {
    console.error("❌ [handleStep fatal]:", err);
    await resetSession(uid);
    return safeStart(bot, uid);
  }
}

// ————— Individual handlers —————

async function handleRegion(bot, uid, input, session, userMessages) {
  const region = Object.entries(REGION_MAP)
    .find(([key]) => key.toLowerCase() === input);
  if (!region || !region[1]?.active) {
    return renderStep(bot, uid, 1, userMessages);
  }
  session.region = region[0];
  session.step   = 1.2;
  return renderStep(bot, uid, 1.2, userMessages);
}

async function handleCity(bot, uid, input, session, userMessages) {
  const clean = input.replace(/^🚫 /, "");
  const cities = REGION_MAP[session.region]?.cities || {};
  const city   = Object.keys(cities)
    .find(c => c.toLowerCase() === clean);
  if (!city) {
    return renderStep(bot, uid, 1.2, userMessages);
  }
  session.city = city;
  session.step = 2;
  return renderStep(bot, uid, 2, userMessages);
}

async function handleDelivery(bot, uid, input, session, userMessages) {
  const method = deliveryMethods
    .find(m => m.label.toLowerCase() === input);
  if (!method) return renderStep(bot, uid, 2, userMessages);
  session.deliveryMethod = method.key;
  session.deliveryFee    = Number(method.fee) || 0;
  session.step           = 2.1;
  return renderStep(bot, uid, 2.1, userMessages);
}

async function handlePromoDecision(bot, uid, input, session, userMessages) {
  if (input === MENU_BUTTONS.YES.text.toLowerCase()) {
    session.step = 2.2;
  } else if (input === MENU_BUTTONS.NO.text.toLowerCase()) {
    session.step = 3;
  } else {
    return renderStep(bot, uid, 2.1, userMessages);
  }
  return renderStep(bot, uid, session.step, userMessages);
}

async function handlePromoCode(bot, uid, raw, session, userMessages) {
  const code  = raw.toUpperCase().trim();
  const promo = DISCOUNTS.codes?.[code];
  if (!promo?.active) {
    await sendAndTrack(bot, uid, `❌ Invalid promo: \`${code}\``,
      { parse_mode: "Markdown" }, userMessages);
    session.step = 2.1;
    return renderStep(bot, uid, 2.1, userMessages);
  }
  session.promoCode = code;
  await sendAndTrack(bot, uid,
    `🏷️ Promo applied: *${code}* (${promo.percentage}%)`,
    { parse_mode: "Markdown" }, userMessages);
  session.step = 3;
  return renderStep(bot, uid, 3, userMessages);
}

async function handleCategory(bot, uid, input, session, userMessages) {
  const cat = Object.keys(products)
    .find(c => c.toLowerCase() === input);
  if (!cat) return renderStep(bot, uid, 3, userMessages);
  session.category = cat;
  session.step     = 4;
  return renderStep(bot, uid, 4, userMessages);
}

async function handleProduct(bot, uid, input, session, userMessages) {
  const prod = products[session.category]
    ?.find(p => p.name.toLowerCase() === input);
  if (!prod) return renderStep(bot, uid, 4, userMessages);
  session.product = prod;
  session.step    = 5;
  return renderStep(bot, uid, 5, userMessages);
}

async function handleQuantity(bot, uid, input, session, userMessages) {
  const qty   = input.match(/^[^\s(]+/)?.[0];
  const price = session.product?.prices?.[qty];
  if (!isFinite(price)) return renderStep(bot, uid, 5, userMessages);

  const discount = resolveDiscount({
    userId:      uid,
    code:        session.promoCode,
    region:      session.region,
    city:        session.city,
    category:    session.category,
    productName: session.product.name
  }, DISCOUNTS);

  const unit   = +(price - (price * discount) / 100).toFixed(2);
  const total  = +(unit + session.deliveryFee).toFixed(2);

  session.quantity        = qty;
  session.unitPrice       = unit;
  session.totalPrice      = total;
  session.appliedDiscount = discount;
  session.step            = 6;
  return renderStep(bot, uid, 6, userMessages);
}

async function handleCurrency(bot, uid, input, session, userMessages) {
  const wallet = WALLETS[input.toUpperCase()];
  if (!wallet) return renderStep(bot, uid, 6, userMessages);
  session.currency = input.toUpperCase();
  session.wallet   = wallet;
  session.step     = 7;
  return renderStep(bot, uid, 7, userMessages);
}

async function handleOrderConfirm(bot, uid, input, session, userMessages) {
  if (input !== MENU_BUTTONS.CONFIRM.text.toLowerCase()) {
    return renderStep(bot, uid, 7, userMessages);
  }
  return handlePayment(bot, uid, userMessages);
}

async function handleConfirmOrCancel(bot, uid, input, session, userMessages) {
  if (input === MENU_BUTTONS.CONFIRM.text.toLowerCase()) {
    session.step = 9;
    return handlePaymentConfirmation(bot, uid, userMessages);
  }
  if (input === MENU_BUTTONS.CANCEL.text.toLowerCase()) {
    await sendAndTrack(bot, uid, "❌ Payment canceled. Returning to main menu...", {}, userMessages);
    await resetSession(uid);
    return safeStart(bot, uid);
  }
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleBackButton(bot, uid, session, userMessages) {
  const map = { 1.2:1, 2:1.2, 2.1:2, 2.2:2.1, 3:2.1, 4:3, 5:4, 6:5, 7:6, 8:7 };
  session.step = map[session.step] || 1;
  return renderStep(bot, uid, session.step, userMessages);
}

// ————— Utils —————
function sanitizeId(id) {
  const s = String(id||"").trim();
  return s && s!=="undefined"&&s!=="null"?s:null;
}
function normalizeText(txt) {
  return txt?.toString().trim().toLowerCase();
}
