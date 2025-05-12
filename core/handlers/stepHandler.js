// 📦 core/handlers/stepHandler.js | FINAL IMMORTAL v999999999999999.∞+ULTIMATE
// 24/7 BULLETPROOF • COMMENT RESTORED • SYNCED • UNIFIED BUTTONS • GODMODE∞

import { renderStep } from "./renderStep.js";
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
import { isValidStep } from "../../state/userState.js";
import { MENU_BUTTONS } from "../../helpers/keyboardConstants.js";

/**
 * ✅ Handles user input step-by-step
 * @param {object} bot - Telegram bot instance
 * @param {string|number} id - User ID
 * @param {string} text - User input
 * @param {object} userMessages - Message tracking object
 * @returns {Promise<void>}
 */
export async function handleStep(bot, id, text, userMessages) {
  const uid = sanitizeId(id);
  const input = normalizeText(text);

  if (!input) {
    await guideUser(bot, uid, userMessages);
    return;
  }

  // 🔒 Validate user session
  validateUserSession(uid);
  const session = userSessions[uid];

  // 🧭 Universal back button
  if (input === MENU_BUTTONS.BACK?.text.toLowerCase()) {
    return await handleBackButton(bot, uid, session, userMessages);
  }

  try {
    switch (session.step) {
      case 1:
        return await handleRegionSelection(bot, uid, input, session, userMessages);

      case 1.2:
        return await handleCitySelection(bot, uid, input, session, userMessages);

      case 2:
        return await handleDeliveryMethod(bot, uid, input, session, userMessages);

      case 2.1:
        return await handlePromoDecision(bot, uid, input, session, userMessages);

      case 2.2:
        return await handlePromoInput(bot, uid, input, session, userMessages);

      case 3:
        return await handleCategorySelection(bot, uid, input, session, userMessages);

      case 4:
        return await handleProductSelection(bot, uid, input, session, userMessages);

      case 5:
        return await handleQuantityPricing(bot, uid, input, session, userMessages);

      case 6:
        return await handleWalletSelection(bot, uid, input, session, userMessages);

      case 7:
        return await handleFinalConfirmation(bot, uid, input, session, userMessages);

      case 8:
        return await handlePaymentConfirmationStep(bot, uid, input, session, userMessages);

      default:
        console.warn(`⚠️ Unknown step="${session.step}" for uid=${uid}`);
        await resetSession(uid);
        return await safeStart(bot, uid);
    }
  } catch (err) {
    console.error("❌ [handleStep fatal]:", err.message || err);
    await resetSession(uid);
    return await safeStart(bot, uid);
  }
}

// ————— HANDLER FUNCTIONS —————

async function guideUser(bot, uid, userMessages) {
  console.log(`🔄 Guiding user ${uid} back to the menu.`);
  await sendAndTrack(bot, uid, "❌ Invalid input. Please use the buttons below:", {
    reply_markup: renderStep(bot, uid, userSessions[uid]?.step || 1, userMessages),
  });
}

async function handleRegionSelection(bot, uid, input, session, userMessages) {
  const region = REGION_MAP[input];
  if (!region?.active) return await guideUser(bot, uid, userMessages);

  session.region = input;
  session.step = 1.2;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleCitySelection(bot, uid, input, session, userMessages) {
  const city = input.replace(/^🚫 /, "");
  const regionCities = REGION_MAP[session.region]?.cities;
  if (!regionCities || !regionCities.hasOwnProperty(city)) return await guideUser(bot, uid, userMessages);

  session.city = city;
  session.step = 2;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleDeliveryMethod(bot, uid, input, session, userMessages) {
  const method = deliveryMethods.find(m => m.label.toLowerCase() === input);
  if (!method) return await guideUser(bot, uid, userMessages);

  session.deliveryMethod = method.key;
  session.deliveryFee = isFinite(Number(method.fee)) ? Number(method.fee) : 0;
  session.step = 2.1;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handlePromoDecision(bot, uid, input, session, userMessages) {
  if (input === MENU_BUTTONS.YES?.text.toLowerCase()) {
    session.step = 2.2;
    return renderStep(bot, uid, session.step, userMessages);
  }
  if (input === MENU_BUTTONS.NO?.text.toLowerCase()) {
    session.step = 3;
    return renderStep(bot, uid, session.step, userMessages);
  }
  return await guideUser(bot, uid, userMessages);
}

async function handlePromoInput(bot, uid, input, session, userMessages) {
  const code = input.toUpperCase();
  const promo = DISCOUNTS.codes?.[code];

  if (!promo?.active) {
    await sendAndTrack(bot, uid, `❌ Invalid/inactive promo: \`${code}\``, { parse_mode: "Markdown" }, userMessages);
    session.step = 2.1;
    return renderStep(bot, uid, session.step, userMessages);
  }

  session.promoCode = code;
  const discountPercent = Number(promo.percentage) || 0;
  await sendAndTrack(bot, uid, `🏷️ Promo applied: *${code}* = ${discountPercent}%`, { parse_mode: "Markdown" }, userMessages);

  session.step = 3;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleCategorySelection(bot, uid, input, session, userMessages) {
  const category = Object.keys(products).find(cat => cat.toLowerCase() === input);
  if (!category) return await guideUser(bot, uid, userMessages);

  session.category = category;
  session.step = 4;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleProductSelection(bot, uid, input, session, userMessages) {
  const product = products[session.category]?.find(p => p.name.toLowerCase() === input);
  if (!product) return await guideUser(bot, uid, userMessages);

  session.product = product;
  session.step = 5;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleQuantityPricing(bot, uid, input, session, userMessages) {
  const qty = input.match(/^[^\s(]+/)?.[0];
  const basePrice = session.product?.prices?.[qty];

  if (!basePrice || !isFinite(basePrice)) return await guideUser(bot, uid, userMessages);

  const discount = resolveDiscount(
    {
      userId: uid,
      code: session.promoCode,
      region: session.region,
      city: session.city,
      category: session.category,
      productName: session.product.name
    },
    DISCOUNTS
  );

  const finalPrice = +(basePrice - (basePrice * discount / 100));
  const total = +(finalPrice + session.deliveryFee).toFixed(2);

  session.quantity = qty;
  session.unitPrice = finalPrice;
  session.totalPrice = total;
  session.appliedDiscount = discount;

  session.step = 6;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleWalletSelection(bot, uid, input, session, userMessages) {
  const wallet = WALLETS[input.toUpperCase()];
  if (!wallet) return await guideUser(bot, uid, userMessages);

  session.currency = input;
  session.wallet = wallet;
  session.step = 7;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleFinalConfirmation(bot, uid, input, session, userMessages) {
  if (input !== MENU_BUTTONS.CONFIRM?.text.toLowerCase()) return await guideUser(bot, uid, userMessages);

  return await handlePayment(bot, uid, userMessages);
}

async function handlePaymentConfirmationStep(bot, uid, input, session, userMessages) {
  if (input === MENU_BUTTONS.CONFIRM?.text.toLowerCase()) {
    session.step = 9;
    return await handlePaymentConfirmation(bot, uid, userMessages);
  }

  if (input === MENU_BUTTONS.CANCEL?.text.toLowerCase()) {
    await sendAndTrack(bot, uid, "❌ Payment canceled. Returning to main menu...", {}, userMessages);
    await resetSession(uid);
    return setTimeout(() => safeStart(bot, uid), 300);
  }

  return await guideUser(bot, uid, userMessages);
}

// ————— HELPER FUNCTIONS —————

/**
 * ✅ Validates and resets invalid user sessions
 * @param {string} uid - User ID
 */
function validateUserSession(uid) {
  if (!userSessions[uid]) {
    userSessions[uid] = { step: 1, createdAt: Date.now() };
  }

  const session = userSessions[uid];
  if (!isValidStep(session.step)) {
    console.warn(`⚠️ Invalid step "${session.step}" for user ${uid}. Resetting to step 1.`);
    session.step = 1;
  }
}

/**
 * 🧠 Sanitizes user ID input
 * @param {string|number} id - Input ID
 * @returns {string|null} - Sanitized ID or null if invalid
 */
function sanitizeId(id) {
  const uid = String(id || "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}

/**
 * ✅ Normalizes user input text
 * @param {string} txt - Raw user input
 * @returns {string} - Normalized text
 */
function normalizeText(txt) {
  return txt?.toString().trim().toLowerCase();
}
