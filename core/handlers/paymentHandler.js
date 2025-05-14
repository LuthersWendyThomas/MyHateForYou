// 📦 core/handlers/paymentHandler.js | IMMORTAL FINAL v3.0.0•DIAMONDLOCK•FULLSYNC
// AMOUNT-BASED QR SYSTEM • BULLETPROOF FALLBACK • 24/7 CACHED + LIVE

import { getCachedQR } from "../../utils/qrCacheManager.js";
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

/**
 * 💤 Sleep util (used for rate-limit backoff)
 */
function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/**
 * 🔁 Normalizes currency input to full uppercase symbol
 */
function normalizeSymbol(raw) {
  const key = String(raw || "").trim().toLowerCase();
  return (ALIASES[key] || key).toUpperCase();
}

/**
 * 📈 Fetches live crypto rate
 */
async function getSafeRate(currency) {
  const symbol = normalizeSymbol(currency);
  if (!NETWORKS[symbol]) throw new Error(`Unsupported currency: ${symbol}`);
  const rate = await fetchCryptoPrice(symbol);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Invalid rate for ${symbol}`);
  return { rate, symbol };
}

/**
 * 🔁 Executes Telegram API calls with retry logic (3x)
 */
async function safeSend(fn, ...args) {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn(...args);
    } catch (err) {
      const isRateLimit = String(err.message).includes("429");
      if (isRateLimit) {
        const backoff = 500 + i * 600;
        console.warn(`⏳ Rate limit (${i + 1}) – retrying in ${backoff}ms`);
        await wait(backoff);
      } else {
        break;
      }
    }
  }
  return null;
}

/**
 * 💸 Payment flow entrypoint (step 7 → 9)
 */
export async function handlePayment(bot, id, userMsgs) {
  const session = userSessions[id];
  if (!session || session.step !== 7 || session.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ Invalid or duplicate payment attempt.", {}, userMsgs);
  }

  session.paymentInProgress = true;

  try {
    const productUSD = Number(session.totalPrice);
    const deliveryUSD = Number(session.deliveryFee || 0);
    const usd = productUSD + deliveryUSD;

    if (
      !session.wallet || !session.currency || !session.product?.name ||
      !session.quantity || !isFinite(usd)
    ) throw new Error("Incomplete order data");

    const { rate, symbol } = await getSafeRate(session.currency);
    const amount = +(usd / rate).toFixed(6);
    if (!isFinite(amount) || amount <= 0) throw new Error("Calculated crypto amount invalid");

    session.expectedAmount = amount;
    session.step = 9;

    // ✅ Get fallback or live QR via amount-based file
    const qrBuffer = await getCachedQR(symbol, amount);
    if (!qrBuffer || !Buffer.isBuffer(qrBuffer)) {
      throw new Error("QR fallback failed (both cache and live)");
    }

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

    // ⏳ Start payment timer
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
 * ❌ Cancels payment step
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
 * ✅ Verifies blockchain payment
 */
export async function handlePaymentConfirmation(bot, id, userMsgs) {
  const session = userSessions[id];
  if (
    !session || session.step !== 9 || !session.wallet ||
    !session.currency || !session.expectedAmount || !session.deliveryMethod
  ) {
    return sendAndTrack(bot, id, "⚠️ Session expired or invalid. Use /start to retry.", {}, userMsgs);
  }

  try {
    await sendAndTrack(bot, id, "⏳ Verifying payment on blockchain...", {}, userMsgs);

    const symbol = normalizeSymbol(session.currency);
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

    await sendAdminPing(
      `💸 *Payment confirmed* from UID \`${id}\`\n` +
      `📦 Product: *${session.product?.name}*\n` +
      `🔢 Qty: *${session.quantity}* • 💵 $${session.totalPrice}\n` +
      `🔗 Currency: *${session.currency}*`
    );

    session.deliveryInProgress = true;

    await sendAndTrack(bot, id, "✅ Payment confirmed!\n🚚 Delivery starting...", {}, userMsgs);
    return simulateDelivery(bot, id, session.deliveryMethod, userMsgs);

  } catch (err) {
    console.error("❌ [handlePaymentConfirmation error]:", err.message || err);
    return sendAndTrack(bot, id, "❗️ Verification failed. Please try again later.", {}, userMsgs);
  }
}

/**
 * 🧼 Cleans session/timer on error
 */
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

/**
 * 🔔 Sends admin message (Markdown)
 */
export async function sendAdminPing(msg) {
  try {
    const adminId = process.env.ADMIN_ID;
    if (!adminId) return;
    await BOT.INSTANCE.sendMessage(adminId, msg, { parse_mode: "Markdown" });
  } catch (e) {
    console.warn("⚠️ [sendAdminPing failed]", e.message);
  }
}
