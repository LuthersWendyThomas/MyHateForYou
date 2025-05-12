// 📦 core/handlers/paymentHandler.js | DIAMOND FINAL v999999999999999.∞+ULTIMATE
// 24/7 BULLETPROOF | BTC, ETH, MATIC, SOL | QR + PRICE SYNC + DELIVERY INTEGRATED

import { generateQR } from "../../utils/generateQR.js";
import { checkPayment } from "../../utils/cryptoChecker.js";
import { fetchCryptoPrice } from "../../utils/fetchCryptoPrice.js";
import { saveOrder } from "../../utils/saveOrder.js";
import { sendAndTrack, sendKeyboard } from "../../helpers/messageUtils.js";
import { simulateDelivery } from "./deliveryHandler.js";
import { safeStart } from "./finalHandler.js";
import { userSessions, userOrders, paymentTimers } from "../../state/userState.js";
import { BOT, ALIASES } from "../../config/config.js";

const SUPPORTED_CURRENCIES = {
  BTC: { gecko: "bitcoin", coincap: "bitcoin" },
  ETH: { gecko: "ethereum", coincap: "ethereum" },
  MATIC: { gecko: "matic-network", coincap: "matic" },
  SOL: { gecko: "solana", coincap: "solana" }
};

/**
 * Delays execution for a specified time.
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff.
 */
async function fetchWithRetry(fn, retries = 4, delay = 1200) {
  for (let i = 0; i <= retries; i++) {
    try {
      if (i > 0) await wait(i * delay);
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      console.warn(`⚠️ [Retry ${i + 1}]`, err.message);
    }
  }
}

/**
 * Normalizes the currency input to a standard format.
 */
function normalizeCurrency(input) {
  return ALIASES[String(input).toLowerCase()] || String(input).toUpperCase();
}

/**
 * Fetches a safe crypto rate with validations.
 */
async function getSafeRate(currency) {
  const symbol = normalizeCurrency(currency);
  const coin = SUPPORTED_CURRENCIES[symbol];
  if (!coin) throw new Error(`Unsupported currency: ${symbol}`);

  const rate = await fetchWithRetry(() => fetchCryptoPrice(symbol));
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Invalid rate for ${symbol}`);
  return { rate, symbol };
}

/**
 * Ensures safe message sending with retries.
 */
async function sendSafe(fn, ...args) {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn(...args);
    } catch (err) {
      if (String(err?.message || "").includes("429")) {
        const delay = 1500 + i * 1000;
        console.warn(`⏳ Rate limit hit. Retrying in ${delay}ms`);
        await wait(delay);
      } else {
        console.warn("⚠️ sendSafe error:", err.message);
        break;
      }
    }
  }
  return null;
}

/**
 * Handles payment setup and QR generation.
 */
export async function handlePayment(bot, id, userMessages) {
  const session = userSessions[id];
  if (!session || session.step !== 7 || session.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ Invalid or duplicate payment attempt.", {}, userMessages);
  }

  session.paymentInProgress = true;

  try {
    const usd = parseFloat(session.totalPrice);
    if (!session.wallet || !session.currency || !session.product?.name || !session.quantity || !Number.isFinite(usd)) {
      throw new Error("❌ Invalid payment session data");
    }

    const { rate, symbol } = await getSafeRate(session.currency);
    const amount = +(usd / rate).toFixed(6);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("❌ Invalid crypto amount");

    session.expectedAmount = amount;
    session.step = 8;

    const qr = await generateQR(symbol, amount, session.wallet);
    if (!qr || !(qr instanceof Buffer)) throw new Error("❌ QR generation failed");

    const summary = `
💸 *Payment summary:*

• Product: ${session.product.name}
• Quantity: ${session.quantity}
• Delivery: ${session.deliveryMethod} (${session.deliveryFee}$)
• Location: ${session.city}

💰 ${usd.toFixed(2)}$ ≈ ${amount} ${symbol}
🏦 Wallet: \`${session.wallet}\`

⏱ ETA: ~30 minutes
✅ Scan QR or copy the address.
`.trim();

    await sendSafe(() => bot.sendChatAction(id, "upload_photo"));
    await sendSafe(() => bot.sendPhoto(id, qr, {
      caption: summary,
      parse_mode: "Markdown"
    }));

    if (paymentTimers[id]) clearTimeout(paymentTimers[id]);

    const timer = setTimeout(() => {
      console.warn(`⌛️ Payment timeout: ${id}`);
      delete paymentTimers[id];
      delete userSessions[id];
    }, 30 * 60 * 1000);

    session.paymentTimer = timer;
    paymentTimers[id] = timer;

    return sendKeyboard(bot, id, "❓ *Was the payment completed?*", [
      [{ text: "✅ CONFIRM" }],
      [{ text: "❌ Cancel payment" }]
    ], userMessages);

  } catch (err) {
    console.error("❌ [handlePayment]:", err.message);
    session.paymentInProgress = false;
    return sendAndTrack(bot, id, `❗️ Payment setup failed.\n*${err.message}*`, {
      parse_mode: "Markdown"
    }, userMessages);
  }
}

/**
 * Handles payment cancellation.
 */
export async function handlePaymentCancel(bot, id, userMessages) {
  const session = userSessions[id];
  if (!session || session.step !== 8 || !session.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ No active payment to cancel.", {}, userMessages);
  }

  clearTimeout(session.paymentTimer);
  delete paymentTimers[id];
  delete userSessions[id];

  await sendAndTrack(bot, id, "❌ Payment canceled. Returning to main menu...", {}, userMessages);
  return setTimeout(() => safeStart(bot, id), 500);
}

/**
 * Handles payment confirmation after blockchain check.
 */
export async function handlePaymentConfirmation(bot, id, userMessages) {
  const session = userSessions[id];
  if (!(session && session.step === 9 && session.wallet && session.currency && session.expectedAmount)) {
    return sendAndTrack(bot, id, "⚠️ Invalid session. Type /start to begin.", {}, userMessages);
  }

  try {
    await sendAndTrack(bot, id, "⏳ Checking payment on blockchain...", {}, userMessages);

    const symbol = normalizeCurrency(session.currency);
    const paid = await fetchWithRetry(() =>
      checkPayment(session.wallet, symbol, session.expectedAmount, bot)
    );

    if (!paid) {
      return sendKeyboard(bot, id, "❌ Payment not yet detected. Try again:", [
        [{ text: "✅ CONFIRM" }],
        [{ text: "❌ Cancel payment" }]
      ], userMessages);
    }

    clearTimeout(session.paymentTimer);
    delete paymentTimers[id];

    delete session.paymentInProgress;
    delete session.expectedAmount;

    userOrders[id] = (userOrders[id] || 0) + 1;

    await saveOrder(id, session.city, session.product.name, session.totalPrice).catch(e =>
      console.warn("⚠️ [saveOrder failed]:", e.message)
    );

    await sendAndTrack(bot, id, "✅ Payment confirmed! Delivery is starting...", {}, userMessages);

    if (BOT.ADMIN_ID && bot?.sendMessage) {
      await sendSafe(() =>
        bot.sendMessage(BOT.ADMIN_ID, `✅ New payment confirmed → ${session.wallet}`, {
          parse_mode: "Markdown"
        })
      );
    }

    return simulateDelivery(bot, id);
  } catch (err) {
    console.error("❌ [handlePaymentConfirmation]:", err.message);
    return sendAndTrack(bot, id, "❗️ Blockchain check failed. Try again later.", {}, userMessages);
  }
}
