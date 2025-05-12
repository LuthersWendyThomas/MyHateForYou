// 📦 core/handlers/stepHandler.js | IMMORTAL FINAL v999999999999999.∞.ULTIMATE.GODMODE+SYNC+DIAMONDLOCK
// 24/7 BULLETPROOF • NO MORE EXTERNAL renderStep.js • PROMO-ONLY INPUT • FSM-LOCKED • DIAMOND SAFE

import { deliveryMethods } from "../../config/features.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { userSessions, isValidStep } from "../../state/userState.js";
import { sendAndTrack, sendKeyboard } from "../../helpers/messageUtils.js";
import { handlePayment, handlePaymentConfirmation } from "./paymentHandler.js";
import { resetSession, safeStart } from "./finalHandler.js";
import { REGION_MAP, getRegionKeyboard, getCityKeyboard } from "../../config/regions.js";
import { resolveDiscount } from "../../config/discountUtils.js";
import { DISCOUNTS } from "../../config/discounts.js";
import { MENU_BUTTONS } from "../../helpers/keyboardConstants.js";

/**
 * 🔁 Main FSM step renderer
 */
async function renderStep(bot, uid, step, userMessages) {
  const session = userSessions[uid];
  validateSession(session);

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
        // 🏙️ City selector (based on region)
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
        // 🏷️ Enter promo code
        return sendKeyboard(
          bot, uid,
          "🏷️ *Enter your promo code:*",
          [[{ text: MENU_BUTTONS.BACK.text }]],
          userMessages,
          { parse_mode: "Markdown" }
        );
      }

      case 3: {
        // 📦 Category selection
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
        // 🛍️ Product selection
        const category = session.category;
        const list = products[category] || [];
        const keyboard = list.map(p =>
          [{ text: p.active ? p.name : `🚫 ${p.name}` }]
        );
        keyboard.push([{ text: MENU_BUTTONS.BACK.text }]);
        return sendKeyboard(
          bot, uid,
          `🛍️ *Select product from ${category}:*`,
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }

      case 5: {
        // 🔢 Quantity selection
        const priceList = session.product?.prices || {};
        const keyboard = Object.entries(priceList).map(
          ([qty, price]) => [{ text: `${qty} (${price}€)` }]
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
        // 💰 Currency selection
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
          `💵 Unit Price: *${unitPrice || 0}€*\n` +
          `🚚 Delivery Fee: *${deliveryFee || 0}€*\n` +
          (promoCode ? `🏷️ Promo: *${promoCode}* (-${appliedDiscount || 0}%)\n` : "") +
          `💳 Currency: *${currency || "—"}*\n\n` +
          `💸 *Total: ${totalPrice || 0}€*\n\n` +
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
        // ⏳ Payment wait
        return sendKeyboard(
          bot, uid,
          "⏳ *Waiting for payment confirmation...*",
          [
            [{ text: MENU_BUTTONS.CONFIRM.text }],
            [{ text: MENU_BUTTONS.CANCEL.text }]
          ],
          userMessages,
          { parse_mode: "Markdown" }
        );
      }

      default: {
        console.warn(`⚠️ Unknown step="${step}" for uid=${uid}`);
        return sendAndTrack(
          bot, uid,
          "⚠️ Unknown step. Returning to start...",
          {},
          userMessages
        );
      }
    }
  } catch (err) {
    console.error("❌ [renderStep]:", err.message || err);
    return sendAndTrack(
      bot, uid,
      "❗️ Something went wrong. Please try again.",
      {},
      userMessages
    );
  }
}

/**
 * 🛡️ Validates session existence
 */
function validateSession(session) {
  if (!session) throw new Error("⚠️ No valid session found.");
}

export async function handleStep(bot, id, text, userMessages) {
  const uid = sanitizeId(id);
  const input = normalizeText(text);

  if (!input) return guideUser(bot, uid, userMessages);
  validateUserSession(uid);
  const session = userSessions[uid];

  if (input === MENU_BUTTONS.BACK.text.toLowerCase()) {
    return await handleBackButton(bot, uid, session, userMessages);
  }

  try {
    switch (session.step) {
      case 1:    return handleRegion(bot, uid, input,    session, userMessages);
      case 1.2:  return handleCity(bot,   uid, input,    session, userMessages);
      case 2:    return handleDelivery(bot,   uid, input,    session, userMessages);
      case 2.1:  return handlePromoDecision(bot, uid, input, session, userMessages);
      case 2.2:  return handlePromoCode(bot,      uid, text, session, userMessages);
      case 3:    return handleCategory(bot, uid, input,    session, userMessages);
      case 4:    return handleProduct(bot,  uid, input,    session, userMessages);
      case 5:    return handleQuantity(bot, uid, input,    session, userMessages);
      case 6:    return handleCurrency(bot, uid, input,    session, userMessages);
      case 7:    return handleOrderConfirm(bot, uid, input, session, userMessages);
      case 8:    return handleConfirmOrCancel(bot, uid, input, session, userMessages);
      default:
        await resetSession(uid);
        return safeStart(bot, uid);
    }
  } catch (err) {
    console.error("❌ [handleStep fatal]:", err.message || err);
    await resetSession(uid);
    return safeStart(bot, uid);
  }
}

// ————— INDIVIDUAL STEPS —————

async function guideUser(bot, uid, userMessages) {
  const step = userSessions[uid]?.step || 1;
  return renderStep(bot, uid, step, userMessages);
}

async function handleRegion(bot, uid, input, session, userMessages) {
  const region = Object.entries(REGION_MAP)
    .find(([key]) => key.toLowerCase() === input);
  if (!region || !region[1]?.active) return guideUser(bot, uid, userMessages);

  session.region = region[0];
  session.step   = 1.2;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleCity(bot, uid, input, session, userMessages) {
  const cleanInput = input.replace(/^🚫 /, "");
  const cities     = REGION_MAP[session.region]?.cities || {};
  const city       = Object.keys(cities)
    .find(c => c.toLowerCase() === cleanInput);
  if (!city) return guideUser(bot, uid, userMessages);

  session.city = city;
  session.step = 2;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleDelivery(bot, uid, input, session, userMessages) {
  const method = deliveryMethods
    .find(m => m.label.toLowerCase() === input);
  if (!method) return guideUser(bot, uid, userMessages);

  session.deliveryMethod = method.key;
  session.deliveryFee    = Number(method.fee) || 0;
  session.step           = 2.1;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handlePromoDecision(bot, uid, input, session, userMessages) {
  if (input === MENU_BUTTONS.YES.text.toLowerCase())    session.step = 2.2;
  else if (input === MENU_BUTTONS.NO.text.toLowerCase()) session.step = 3;
  else return guideUser(bot, uid, userMessages);

  return renderStep(bot, uid, session.step, userMessages);
}

async function handlePromoCode(bot, uid, rawText, session, userMessages) {
  const code  = rawText?.toUpperCase()?.trim();
  const promo = DISCOUNTS.codes?.[code];
  if (!promo?.active) {
    await sendAndTrack(
      bot, uid,
      `❌ Invalid promo: \`${code}\``,
      { parse_mode: "Markdown" },
      userMessages
    );
    session.step = 2.1;
    return renderStep(bot, uid, session.step, userMessages);
  }

  session.promoCode = code;
  await sendAndTrack(
    bot, uid,
    `🏷️ Promo applied: *${code}* (${promo.percentage}%)`,
    { parse_mode: "Markdown" },
    userMessages
  );
  session.step = 3;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleCategory(bot, uid, input, session, userMessages) {
  const match = Object.keys(products)
    .find(c => c.toLowerCase() === input);
  if (!match) return guideUser(bot, uid, userMessages);

  session.category = match;
  session.step     = 4;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleProduct(bot, uid, input, session, userMessages) {
  const match = products[session.category]
    ?.find(p => p.name.toLowerCase() === input);
  if (!match) return guideUser(bot, uid, userMessages);

  session.product = match;
  session.step    = 5;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleQuantity(bot, uid, input, session, userMessages) {
  const qty    = input.match(/^[^\s(]+/)?.[0];
  const price  = session.product?.prices?.[qty];
  if (!isFinite(price)) return guideUser(bot, uid, userMessages);

  const discount = resolveDiscount({
    userId:      uid,
    code:        session.promoCode,
    region:      session.region,
    city:        session.city,
    category:    session.category,
    productName: session.product.name
  }, DISCOUNTS);

  const final = +(price - (price * discount) / 100);
  const total = +(final + session.deliveryFee).toFixed(2);

  session.quantity        = qty;
  session.unitPrice       = final;
  session.totalPrice      = total;
  session.appliedDiscount = discount;
  session.step            = 6;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleCurrency(bot, uid, input, session, userMessages) {
  const wallet = WALLETS[input.toUpperCase()];
  if (!wallet) return guideUser(bot, uid, userMessages);

  session.currency = input.toUpperCase();
  session.wallet   = wallet;
  session.step     = 7;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleOrderConfirm(bot, uid, input, session, userMessages) {
  if (input !== MENU_BUTTONS.CONFIRM.text.toLowerCase())
    return guideUser(bot, uid, userMessages);
  return handlePayment(bot, uid, userMessages);
}

async function handleConfirmOrCancel(bot, uid, input, session, userMessages) {
  if (input === MENU_BUTTONS.CONFIRM.text.toLowerCase()) {
    session.step = 9;
    return handlePaymentConfirmation(bot, uid, userMessages);
  }
  if (input === MENU_BUTTONS.CANCEL.text.toLowerCase()) {
    await sendAndTrack(
      bot, uid,
      "❌ Payment canceled. Returning to main menu...",
      {},
      userMessages
    );
    await resetSession(uid);
    return setTimeout(() => safeStart(bot, uid), 500);
  }
  return guideUser(bot, uid, userMessages);
}

// ————— HELPERS —————

function validateUserSession(uid) {
  if (!userSessions[uid]) userSessions[uid] = { step: 1, createdAt: Date.now() };
  if (!isValidStep(userSessions[uid].step)) userSessions[uid].step = 1;
}

function sanitizeId(id) {
  const uid = String(id || "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}

function normalizeText(txt) {
  return txt?.toString().trim().toLowerCase();
}

async function handleBackButton(bot, uid, session, userMessages) {
  const backMap = {
    1.2:  1,
    2:    1.2,
    2.1:  2,
    2.2:  2.1,
    3:    2.1,
    4:    3,
    5:    4,
    6:    5,
    7:    6,
    8:    7
  };
  session.step = backMap[session.step] || 1;
  return renderStep(bot, uid, session.step, userMessages);
}
