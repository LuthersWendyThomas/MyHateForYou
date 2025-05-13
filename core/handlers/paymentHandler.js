// 📦 core/handlers/paymentHandler.js | IMMORTAL FINAL v1.0.9•999999X•DIAMONDLOCK•SYNC•GODMODE
import { generateQR } from "../../utils/generateQR.js";
import { checkPayment } from "../../utils/cryptoChecker.js";
import { fetchCryptoPrice, NETWORKS } from "../../utils/fetchCryptoPrice.js";
import { saveOrder } from "../../utils/saveOrder.js";
import {
  sendAndTrack,
  sendPhotoAndTrack,
  sendKeyboard
} from "../../helpers/messageUtils.js";
import { simulateDelivery } from "./deliveryHandler.js";
import { safeStart } from "./finalHandler.js";
import {
  userSessions,
  userOrders,
  paymentTimers
} from "../../state/userState.js";
import { BOT, ALIASES } from "../../config/config.js";
import { MENU_BUTTONS } from "../../helpers/keyboardConstants.js";

const TIMEOUT_MS = 30 * 60 * 1000;

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function normalizeCurrency(raw) {
  const key = raw.trim().toLowerCase();
  return (ALIASES[key] || key).toUpperCase();
}

async function getSafeRate(currency) {
  const symbol = normalizeCurrency(currency);
  if (!NETWORKS[symbol]) throw new Error(`Unsupported currency: ${symbol}`);
  const rate = await fetchCryptoPrice(symbol);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Invalid rate for ${symbol}`);
  return { rate, symbol };
}

async function safeSend(fn, ...args) {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn(...args);
    } catch (err) {
      if (String(err.message).includes("429")) {
        const backoff = 1000 + i * 800;
        console.warn(`⏳ Rate limit (${i + 1}) – retrying in ${backoff}ms`);
        await wait(backoff);
      } else break;
    }
  }
  return null;
}

/**
 * 💸 Start crypto payment flow
 */
export async function handlePayment(bot, id, userMsgs) {
  const session = userSessions[id];
  if (!session || session.step !== 7 || session.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ Invalid or duplicate payment attempt.", {}, userMsgs);
  }

  session.paymentInProgress = true;

  try {
    const usd = Number(session.totalPrice);
    if (
      !session.wallet || !session.currency || !session.product?.name ||
      !session.quantity || !isFinite(usd)
    ) throw new Error("Incomplete order data");

    const { rate, symbol } = await getSafeRate(session.currency);
    const amount = +(usd / rate).toFixed(6);
    if (!isFinite(amount) || amount <= 0) throw new Error("Calculated crypto amount invalid");

    session.expectedAmount = amount;
    session.step = 9;

    const qrBuffer = await generateQR(symbol, amount, session.wallet);
    if (!qrBuffer) throw new Error("Failed to generate QR code");

    const summary = `
💸 *Payment summary:*
• Product: *${session.product.name}*
• Quantity: *${session.quantity}*
• Delivery: *${session.deliveryMethod}* (${session.deliveryFee}$)
• City: *${session.city}*

💰 *${usd.toFixed(2)}* USD ≈ *${amount} ${symbol}*
🏦 Wallet: \`${session.wallet}\`

⏱ ETA: ~30 minutes  
✅ Scan QR or copy address`.trim();

    await safeSend(() => bot.sendChatAction(id, "upload_photo"));
    await sendPhotoAndTrack(bot, id, qrBuffer, {
      caption: summary,
      parse_mode: "Markdown"
    }, userMsgs);

    if (paymentTimers[id]) clearTimeout(paymentTimers[id]);
    const timer = setTimeout(() => {
      console.warn(`⌛️ [payment timeout] User ${id}`);
      delete paymentTimers[id];
      delete userSessions[id];
    }, TIMEOUT_MS);
    session.paymentTimer = timer;
    paymentTimers[id] = timer;

    return sendKeyboard(bot, id, "❓ *Has the payment completed?*", [
      [{ text: MENU_BUTTONS.CONFIRM.text }],
      [{ text: MENU_BUTTONS.CANCEL.text }]
    ], userMsgs, { parse_mode: "Markdown" });

  } catch (err) {
    console.error("❌ [handlePayment error]:", err.message || err);
    cleanupOnError(id);
    return sendAndTrack(bot, id, `❗️ Payment failed:\n*${err.message}*`, {
      parse_mode: "Markdown"
    }, userMsgs);
  }
}

/**
 * ❌ Cancel payment manually
 */
export async function handlePaymentCancel(bot, id, userMsgs) {
  const session = userSessions[id];
  if (!session || session.step !== 9 || !session.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ No active payment to cancel.", {}, userMsgs);
  }

  clearTimeout(session.paymentTimer);
  delete paymentTimers[id];
  delete userSessions[id];

  await sendAndTrack(bot, id, "❌ Payment canceled. Returning to main menu...", {}, userMsgs);
  return safeStart(bot, id);
}

/**
 * ✅ Confirm payment → verify on blockchain
 */
export async function handlePaymentConfirmation(bot, id, userMsgs) {
  const session = userSessions[id];
  if (
    !session || session.step !== 9 || !session.wallet ||
    !session.currency || !session.expectedAmount
  ) {
    return sendAndTrack(bot, id, "⚠️ Session expired or invalid. Use /start to retry.", {}, userMsgs);
  }

  try {
    await sendAndTrack(bot, id, "⏳ Verifying payment on blockchain...", {}, userMsgs);

    const symbol = normalizeCurrency(session.currency);
    const paid = await checkPayment(session.wallet, symbol, session.expectedAmount);

    if (!paid) {
      return sendKeyboard(bot, id, "❌ Payment not found. Try again:", [
        [{ text: MENU_BUTTONS.CONFIRM.text }],
        [{ text: MENU_BUTTONS.CANCEL.text }]
      ], userMsgs, { parse_mode: "Markdown" });
    }

    clearTimeout(session.paymentTimer);
    delete paymentTimers[id];
    delete session.paymentInProgress;
    delete session.expectedAmount;

    userOrders[id] = (userOrders[id] || 0) + 1;
    saveOrder(id, session.city, session.product.name, session.totalPrice)
      .catch(e => console.warn("⚠️ [saveOrder failed]", e.message));

    await sendAndTrack(bot, id, "✅ Payment confirmed! Delivery starting...", {}, userMsgs);
    return simulateDelivery(bot, id, session.deliveryMethod, userMsgs);

  } catch (err) {
    console.error("❌ [handlePaymentConfirmation error]:", err.message || err);
    return sendAndTrack(bot, id, "❗️ Verification failed. Please try again later.", {}, userMsgs);
  }
}

// 🧼 Cleanup helper
function cleanupOnError(id) {
  const session = userSessions[id];
  if (!session) return;
  delete session.paymentInProgress;
  delete session.expectedAmount;
  if (paymentTimers[id]) {
    clearTimeout(paymentTimers[id]);
    delete paymentTimers[id];
  }
}
