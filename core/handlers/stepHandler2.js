// 📦 core/handlers/stepHandler.js | IMMORTAL FINAL v1.0.9•99999999X•ULTIMATE•GODMODE•DIAMONDLOCK
// 24/7 BULLETPROOF • FSM SAFE ENGINE • FLOOD RESISTANT • FULL USD SUPPORT • PERFECT SYNC

import { getAmountFilename, getFallbackPath } from "../../utils/fallbackPathUtils.js";
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

      case 9: {
        const keyboard = [
          [{ text: MENU_BUTTONS.CONFIRM.text }],
          [{ text: MENU_BUTTONS.CANCEL.text }]
        ];
        return sendKeyboard(
          bot, uid,
          "⏳ *Has the payment completed?*\n\nPress ✅ *Confirm* once you've paid, or ❌ *Cancel* to abort.",
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

  if (isSpamming(uid, ctx)) return;
  const muted = await handleFlood(uid, bot, userMessages[uid], ctx);
  if (muted) return;

  if (!userSessions[uid])                   userSessions[uid] = { step: 1, createdAt: Date.now() };
  if (!isValidStep(userSessions[uid].step)) userSessions[uid].step = 1;
  const session = userSessions[uid];

  // Delivery guard
  if (session.step === 2) {
    const validLabels = deliveryMethods.map(m => m.label.toLowerCase());
    const backLabel   = MENU_BUTTONS.BACK.text.toLowerCase();
    if (!validLabels.includes(input) && input !== backLabel) {
      return renderStep(bot, uid, 2, userMessages);
    }
  }

  // 👁‍🗨 Anti-double-confirm spam patch
  if (input === MENU_BUTTONS.CONFIRM.text.toLowerCase()) {
    const now = Date.now();
    const last = lastConfirmTimestamps[uid] || 0;
    const delay = now - last;

    if (delay < 5000) {
      await sendAndTrack(bot, uid, "⚠️ Auto SPAM system is moving you back to START!", { parse_mode: "Markdown" }, userMessages);
      await resetSession(uid);
      return safeStart(bot, uid);
    }

    lastConfirmTimestamps[uid] = now;
  }

  if (!input) {
    return renderStep(bot, uid, session.step, userMessages);
  }

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
      case 9:   return handleFinalConfirmation(bot, uid, input, session, userMessages);
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

async function handleOrderConfirm(bot, uid, input, session, userMessages) {
  if (input !== MENU_BUTTONS.CONFIRM.text.toLowerCase()) {
    return renderStep(bot, uid, 7, userMessages);
  }

  await sendAndTrack(bot, uid, "⏳ Loading payment info...", { parse_mode: "Markdown" }, userMessages);
  return handlePayment(bot, uid, userMessages);
}

async function handleConfirmOrCancel(bot, uid, input, session, userMessages) {
  if (input === MENU_BUTTONS.CONFIRM.text.toLowerCase()) {
    session.step = 9;
    return handlePaymentConfirmation(bot, uid, userMessages);
  }

  if (input === MENU_BUTTONS.CANCEL.text.toLowerCase()) {
    await sendAndTrack(bot, uid, "❌ Payment canceled. Returning to main menu...", { parse_mode: "Markdown" }, userMessages);
    await resetSession(uid);
    return safeStart(bot, uid);
  }

  return renderStep(bot, uid, session.step, userMessages);
}

async function handleFinalConfirmation(bot, uid, input, session, userMessages) {
  if (input === MENU_BUTTONS.CONFIRM.text.toLowerCase()) {
    return handlePaymentConfirmation(bot, uid, userMessages);
  }

  if (input === MENU_BUTTONS.CANCEL.text.toLowerCase()) {
    await sendAndTrack(bot, uid, "❌ Payment canceled. Returning to main menu...", { parse_mode: "Markdown" }, userMessages);
    await resetSession(uid);
    return safeStart(bot, uid);
  }

  return renderStep(bot, uid, 9, userMessages);
// ——— Helpers ———

function normalizeText(txt) {
  return txt?.toString().trim().toLowerCase();
}

function sanitizeId(id) {
  const s = String(id || "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}
