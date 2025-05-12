// 📦 core/handlers/stepHandler.js | FINAL IMMORTAL v999999999999999.∞.ULTIMATE.GODMODE+SYNC
// 🔒 24/7 BULLETPROOF • TEXT-RESTRICTED • REGION/CITY VALIDATION • PROMO INPUT ONLY • FSM LOCKED

import { renderStep } from "./renderStep.js";
import { deliveryMethods } from "../../config/features.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { userSessions, isValidStep } from "../../state/userState.js";
import { sendAndTrack } from "../../helpers/messageUtils.js";
import { handlePayment, handlePaymentConfirmation } from "./paymentHandler.js";
import { resetSession, safeStart } from "./finalHandler.js";
import { REGION_MAP } from "../../config/regions.js";
import { resolveDiscount } from "../../config/discountUtils.js";
import { DISCOUNTS } from "../../config/discounts.js";
import { MENU_BUTTONS } from "../../helpers/keyboardConstants.js";

export async function handleStep(bot, id, text, userMessages) {
  const uid = sanitizeId(id);
  const input = normalizeText(text);

  if (!input) return await guideUser(bot, uid, userMessages);
  validateUserSession(uid);
  const session = userSessions[uid];

  if (input === MENU_BUTTONS.BACK?.text.toLowerCase()) {
    return await handleBackButton(bot, uid, session, userMessages);
  }

  try {
    switch (session.step) {
      case 1: return await handleRegionSelection(bot, uid, input, session, userMessages);
      case 1.2: return await handleCitySelection(bot, uid, input, session, userMessages);
      case 2: return await handleDeliveryMethod(bot, uid, input, session, userMessages);
      case 2.1: return await handlePromoDecision(bot, uid, input, session, userMessages);
      case 2.2: return await handlePromoInput(bot, uid, text, session, userMessages); // only promo accepts raw text
      case 3: return await handleCategorySelection(bot, uid, input, session, userMessages);
      case 4: return await handleProductSelection(bot, uid, input, session, userMessages);
      case 5: return await handleQuantityPricing(bot, uid, input, session, userMessages);
      case 6: return await handleWalletSelection(bot, uid, input, session, userMessages);
      case 7: return await handleFinalConfirmation(bot, uid, input, session, userMessages);
      case 8: return await handlePaymentConfirmationStep(bot, uid, input, session, userMessages);
      default:
        await resetSession(uid);
        return await safeStart(bot, uid);
    }
  } catch (err) {
    console.error("❌ [handleStep fatal]:", err);
    await resetSession(uid);
    return await safeStart(bot, uid);
  }
}

// ————— STEPS —————

async function guideUser(bot, uid, userMessages) {
  const step = userSessions[uid]?.step || 1;
  return await renderStep(bot, uid, step, userMessages);
}

async function handleRegionSelection(bot, uid, input, session, userMessages) {
  const region = Object.entries(REGION_MAP).find(([key]) => key.toLowerCase() === input);
  if (!region) return await guideUser(bot, uid, userMessages);

  const [regionLabel, regionObj] = region;
  if (!regionObj?.active) return await guideUser(bot, uid, userMessages);

  session.region = regionLabel;
  session.step = 1.2;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleCitySelection(bot, uid, input, session, userMessages) {
  const city = input.replace(/^🚫 /, "");
  const regionCities = REGION_MAP[session.region]?.cities || {};
  const match = Object.keys(regionCities).find(c => c.toLowerCase() === city);
  if (!match) return await guideUser(bot, uid, userMessages);

  session.city = match;
  session.step = 2;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleDeliveryMethod(bot, uid, input, session, userMessages) {
  const method = deliveryMethods.find(m => m.label.toLowerCase() === input);
  if (!method) return await guideUser(bot, uid, userMessages);

  session.deliveryMethod = method.key;
  session.deliveryFee = Number(method.fee) || 0;
  session.step = 2.1;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handlePromoDecision(bot, uid, input, session, userMessages) {
  if (input === MENU_BUTTONS.YES?.text.toLowerCase()) session.step = 2.2;
  else if (input === MENU_BUTTONS.NO?.text.toLowerCase()) session.step = 3;
  else return await guideUser(bot, uid, userMessages);

  return renderStep(bot, uid, session.step, userMessages);
}

async function handlePromoInput(bot, uid, rawText, session, userMessages) {
  const code = rawText?.toUpperCase()?.trim();
  const promo = DISCOUNTS.codes?.[code];
  if (!promo?.active) {
    await sendAndTrack(bot, uid, `❌ Invalid/inactive promo: \`${code}\``, { parse_mode: "Markdown" }, userMessages);
    session.step = 2.1;
    return renderStep(bot, uid, session.step, userMessages);
  }

  session.promoCode = code;
  const percent = Number(promo.percentage) || 0;
  await sendAndTrack(bot, uid, `🏷️ Promo applied: *${code}* = ${percent}%`, { parse_mode: "Markdown" }, userMessages);
  session.step = 3;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleCategorySelection(bot, uid, input, session, userMessages) {
  const match = Object.keys(products).find(c => c.toLowerCase() === input);
  if (!match) return await guideUser(bot, uid, userMessages);

  session.category = match;
  session.step = 4;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleProductSelection(bot, uid, input, session, userMessages) {
  const match = products[session.category]?.find(p => p.name.toLowerCase() === input);
  if (!match) return await guideUser(bot, uid, userMessages);

  session.product = match;
  session.step = 5;
  return renderStep(bot, uid, session.step, userMessages);
}

async function handleQuantityPricing(bot, uid, input, session, userMessages) {
  const qty = input.match(/^[^\s(]+/)?.[0];
  const price = session.product?.prices?.[qty];
  if (!isFinite(price)) return await guideUser(bot, uid, userMessages);

  const discount = resolveDiscount({
    userId: uid,
    code: session.promoCode,
    region: session.region,
    city: session.city,
    category: session.category,
    productName: session.product.name,
  }, DISCOUNTS);

  const final = +(price - (price * discount) / 100);
  const total = +(final + session.deliveryFee).toFixed(2);

  session.quantity = qty;
  session.unitPrice = final;
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

// ————— HELPERS —————

function validateUserSession(uid) {
  if (!userSessions[uid]) userSessions[uid] = { step: 1, createdAt: Date.now() };
  const session = userSessions[uid];
  if (!isValidStep(session.step)) session.step = 1;
}

function sanitizeId(id) {
  const uid = String(id || "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}

function normalizeText(txt) {
  return txt?.toString().trim().toLowerCase();
}
