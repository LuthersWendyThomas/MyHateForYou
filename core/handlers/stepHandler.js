// 📦 core/handlers/stepHandler.js | IMMORTAL FINAL v1.0.9•99999999X•ULTIMATE•GODMODE•DIAMONDLOCK
// 24/7 BULLETPROOF • FSM SAFE ENGINE • FLOOD RESISTANT • FULL USD SUPPORT • PERFECT SYNC

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
import { isSpamming, handleFlood } from "../../utils/floodHandler.js";

async function renderStep(bot, uid, step, userMessages) {
  const session = userSessions[uid];
  if (!session) throw new Error("⚠️ No session found");

  try {
    switch (step) {
      case 1: {
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
        // ❗ guard: only valid delivery labels or Back
        const keyboard = deliveryMethods.map(m => [{ text: m.label }]);
        keyboard.push([{ text: MENU_BUTTONS.BACK.text }]);
        const city = session.city || "your city";
        return sendKeyboard(
          bot, uid,
          `🚚 *Choose delivery method for ${city}:*`,
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 2.1: {
        const keyboard = [
          [{ text: MENU_BUTTONS.YES.text }],
          [{ text: MENU_BUTTONS.NO.text }],
          [{ text: MENU_BUTTONS.BACK.text }]
        ];
        return sendKeyboard(
          bot, uid,
          "🎁 *Have a promo code?*",
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 2.2: {
        return sendKeyboard(
          bot, uid,
          "🏷️ *Enter your promo code:*",
          [[{ text: MENU_BUTTONS.BACK.text }]],
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 3: {
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
        const list = products[session.category] || [];
        const keyboard = list.map(p => [{ text: p.active ? p.name : `🚫 ${p.name}` }]);
        keyboard.push([{ text: MENU_BUTTONS.BACK.text }]);
        return sendKeyboard(
          bot, uid,
          `🛍️ *Select from ${session.category}:*`,
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 5: {
        const priceList = session.product?.prices || {};
        const keyboard = Object.entries(priceList).map(
          ([qty, price]) => [{ text: `${qty} ($${price.toFixed(2)})` }]
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
        const {
          product, quantity, unitPrice, deliveryFee,
          promoCode, appliedDiscount, currency, totalPrice
        } = session;
        const summary =
          `🧾 *Order Summary:*\n\n` +
          `📦 Product: *${product?.name || "—"}*\n` +
          `🔢 Quantity: *${quantity || "—"}*\n` +
          `💵 Unit Price: *$${unitPrice?.toFixed(2) || "0.00"}*\n` +
          `🚚 Delivery Fee: *$${deliveryFee?.toFixed(2) || "0.00"}*\n` +
          (promoCode ? `🏷️ Promo: *${promoCode}* (-${appliedDiscount}%)\n` : "") +
          `💳 Currency: *${currency || "—"}*\n\n` +
          `💸 *Total: $${totalPrice?.toFixed(2) || "0.00"}*\n\n` +
          `✅ Press *${MENU_BUTTONS.CONFIRM.text}* to proceed`;
        const keyboard = [
          [{ text: MENU_BUTTONS.CONFIRM.text }],
          [{ text: MENU_BUTTONS.BACK.text }]
        ];
        return sendKeyboard(
          bot, uid,
          summary,
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      case 8: {
        const keyboard = [
          [{ text: MENU_BUTTONS.CONFIRM.text }],
          [{ text: MENU_BUTTONS.CANCEL.text }]
        ];
        return sendKeyboard(
          bot, uid,
          "⏳ *Waiting for payment...*",
          keyboard,
          userMessages,
          { parse_mode: "Markdown" }
        );
      }
      default: {
        console.warn(`⚠️ renderStep unknown step=${step} for UID=${uid}`);
        return sendAndTrack(
          bot, uid,
          "⚠️ Unexpected step — restarting.",
          {},
          userMessages
        );
      }
    }
  } catch (err) {
    console.error("❌ [renderStep error]:", err);
    return sendAndTrack(
      bot, uid,
      "❗️ Something went wrong. Please try again.",
      {},
      userMessages
    );
  }
}

export async function handleStep(bot, id, text, userMessages, ctx = {}) {
  const uid   = sanitizeId(id);
  const input = normalizeText(text);

  // 🛡️ Anti-flood/spam filter (context-aware: ignores buttons + /start)
  if (isSpamming(uid, ctx)) return;
  const muted = await handleFlood(uid, bot, userMessages[uid], ctx);
  if (muted) return;

  // ensure session exists
  if (!userSessions[uid])                   userSessions[uid] = { step: 1, createdAt: Date.now() };
  if (!isValidStep(userSessions[uid].step)) userSessions[uid].step = 1;
  const session = userSessions[uid];

  // 🔄 Step-2 guard: only accept valid labels or Back
  if (session.step === 2) {
    const validLabels = deliveryMethods.map(m => m.label.toLowerCase());
    const backLabel   = MENU_BUTTONS.BACK.text.toLowerCase();
    if (!validLabels.includes(input) && input !== backLabel) {
      return renderStep(bot, uid, 2, userMessages);
    }
  }

  // empty input → re-render
  if (!input) {
    return renderStep(bot, uid, session.step, userMessages);
  }

  // BACK pressed?
  if (input === MENU_BUTTONS.BACK.text.toLowerCase()) {
    if (session.step === 1.2) {
      await resetSession(uid);
      return safeStart(bot, uid);
    }
    return handleBackButton(bot, uid, session, userMessages);
  }

  try {
    switch (session.step) {
      case 1:   return handleRegion(        bot, uid, input, session, userMessages);
      case 1.2: return handleCity(          bot, uid, input, session, userMessages);
      case 2:   return handleDelivery(      bot, uid, input, session, userMessages);
      case 2.1: return handlePromoDecision( bot, uid, input, session, userMessages);
      case 2.2: return handlePromoCode(     bot, uid, text,   session, userMessages);
      case 3:   return handleCategory(      bot, uid, input, session, userMessages);
      case 4:   return handleProduct(       bot, uid, input, session, userMessages);
      case 5:   return handleQuantity(      bot, uid, input, session, userMessages);
      case 6:   return handleCurrency(      bot, uid, input, session, userMessages);
      case 7:   return handleOrderConfirm(  bot, uid, input, session, userMessages);
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
  // strip leading non-alphanumerics, match full key or stripped name
  const cleaned = input.replace(/^[^a-z0-9]+/i, "").trim().toLowerCase();
  const entry = Object.entries(REGION_MAP).find(([key, { active }]) => {
    if (!active) return false;
    const keyLC = key.toLowerCase();
    const base  = key.replace(/^[^a-z0-9]+/i, "").toLowerCase();
    return keyLC === input || base === cleaned;
  });
  if (!entry) {
    return renderStep(bot, uid, 1, userMessages);
  }
  session.region = entry[0];
  session.step   = 1.2;
  return renderStep(bot, uid, 1.2, userMessages);
}

async function handleCity(bot, uid, input, session, userMessages) {
  // strip any leading emoji/special chars from user input
  const cleaned = input.replace(/^[^a-z0-9]+/i, "").trim().toLowerCase();
  const citiesMap = REGION_MAP[session.region]?.cities || {};
  // match by stripped city name
  const cityKey = Object.keys(citiesMap).find(cityName => {
    const base = cityName
      .replace(/^[^a-z0-9]+/i, "")
      .trim()
      .toLowerCase();
    return base === cleaned;
  });
  if (!cityKey) {
    return renderStep(bot, uid, 1.2, userMessages);
  }
  session.city = cityKey;
  session.step = 2;
  return renderStep(bot, uid, 2, userMessages);
}

async function handleDelivery(bot, uid, input, session, userMessages) {
  const method = deliveryMethods.find(m => m.label.toLowerCase() === input);
  if (!method) return renderStep(bot, uid, 2, userMessages);
  session.deliveryMethod = method.key;
  session.deliveryFee    = Number(method.fee) || 0;
  session.step           = 2.1;
  return renderStep(bot, uid, 2.1, userMessages);
}

async function handlePromoDecision(bot, uid, input, session, userMessages) {
  if (input === MENU_BUTTONS.YES.text.toLowerCase())    session.step = 2.2;
  else if (input === MENU_BUTTONS.NO.text.toLowerCase()) session.step = 3;
  else return renderStep(bot, uid, 2.1, userMessages);
  return renderStep(bot, uid, session.step, userMessages);
}

async function handlePromoCode(bot, uid, raw, session, userMessages) {
  const code  = raw.toUpperCase().trim();
  const promo = DISCOUNTS.codes?.[code];
  if (!promo?.active) {
    await sendAndTrack(bot, uid, `❌ Invalid promo: \`${code}\``, { parse_mode: "Markdown" }, userMessages);
    session.step = 2.1;
    return renderStep(bot, uid, 2.1, userMessages);
  }
  session.promoCode = code;
  session.step      = 3;
  await sendAndTrack(bot, uid, `🏷️ Promo applied: *${code}* (-${promo.percentage}%)`, { parse_mode: "Markdown" }, userMessages);
  return renderStep(bot, uid, 3, userMessages);
}

async function handleCategory(bot, uid, input, session, userMessages) {
  const cat = Object.keys(products).find(c => c.toLowerCase() === input);
  if (!cat) return renderStep(bot, uid, 3, userMessages);
  session.category = cat;
  session.step     = 4;
  return renderStep(bot, uid, 4, userMessages);
}

async function handleProduct(bot, uid, input, session, userMessages) {
  const prod = products[session.category]?.find(p => p.name.toLowerCase() === input);
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

  const unit  = +(price - (price * discount) / 100).toFixed(2);
  const total = +(unit + session.deliveryFee).toFixed(2);

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
  // jei grįžtam iš city selection – full reset
  if (session.step === 1.2) {
    await resetSession(uid);
    return safeStart(bot, uid);
  }
  // kituose žingsniuose – FSM atgal
  const prevMap = { 2:1.2, "2.1":2, "2.2":2.1, 3:2.1, 4:3, 5:4, 6:5, 7:6, 8:7 };
  session.step = prevMap[session.step] || 1;
  return renderStep(bot, uid, session.step, userMessages);
}

// ——— Helpers ———

function sanitizeId(id) {
  const s = String(id || "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function normalizeText(txt) {
  return txt?.toString().trim().toLowerCase();
}
