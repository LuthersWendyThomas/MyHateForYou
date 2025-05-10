// 📦 core/handlers/paymentHandler.js | IMMORTAL FINAL v3_999999999999.∞
// GODMODE BULLETPROOF MATIC FIXED + QR + SYNC + ADMIN + SESSION LOCK

import { generateQR } from "../../utils/generateQR.js";
import { checkPayment } from "../../utils/cryptoChecker.js";
import { fetchCryptoPrice } from "../../utils/fetchCryptoPrice.js";
import { saveOrder } from "../../utils/saveOrder.js";
import { sendAndTrack, sendKeyboard } from "../../helpers/messageUtils.js";
import { simulateDelivery } from "./deliveryHandler.js";
import { safeStart } from "./finalHandler.js";
import { userSessions, userOrders, paymentTimers } from "../../state/userState.js";
import { BOT, ALIASES } from "../../config/config.js";

const SUPPORTED = {
  BTC:   { gecko: "bitcoin",        coincap: "bitcoin" },
  ETH:   { gecko: "ethereum",       coincap: "ethereum" },
  MATIC: { gecko: "matic-network",  coincap: "matic" },
  SOL:   { gecko: "solana",         coincap: "solana" }
};

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(fn, retries = 5, baseDelay = 1500) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      if (i > 0) await wait(i * baseDelay);
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️ [fetchWithRetry ${i + 1}/${retries}]:`, err.message);
    }
  }
  throw lastErr;
}

async function sendSafe(fn, ...args) {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn(...args);
    } catch (err) {
      if (err.response?.statusCode === 429 || err.message?.includes("429")) {
        const delay = (i + 1) * 2000;
        console.warn(`⏳ Telegram rate limit hit → waiting ${delay}ms`);
        await wait(delay);
        continue;
      }
      console.warn("⚠️ [sendSafe error]:", err.message);
    }
  }
  return null;
}

function normalizeCurrency(input) {
  return ALIASES[String(input).toLowerCase()] || String(input).toUpperCase();
}

async function getSafeRate(currency) {
  const symbol = normalizeCurrency(currency);
  const coin = SUPPORTED[symbol];
  if (!coin) throw new Error(`Unsupported currency: "${symbol}"`);

  const rate = await fetchWithRetry(() => fetchCryptoPrice(symbol));
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Invalid rate for "${symbol}"`);
  }

  return { rate, symbol };
}

export async function handlePayment(bot, id, userMessages) {
  const s = userSessions[id];
  if (!s || s.step !== 7 || s.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ Invalid or duplicate payment attempt.", {}, userMessages);
  }

  s.paymentInProgress = true;

  try {
    const usd = parseFloat(s.totalPrice);
    if (!s.wallet || !s.currency || !s.product?.name || !s.quantity || !Number.isFinite(usd)) {
      throw new Error("❌ Missing or invalid payment session data");
    }

    const { rate, symbol } = await getSafeRate(s.currency);
    const amount = +(usd / rate).toFixed(6);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("❌ Invalid crypto amount");

    s.expectedAmount = amount;
    const qr = await generateQR(symbol, amount, s.wallet);
    if (!qr || !(qr instanceof Buffer)) throw new Error("❌ QR generation failed");

    s.step = 8;

    const summary = `
💸 *Payment summary:*

• Product: ${s.product.name}
• Quantity: ${s.quantity}
• Delivery: ${s.deliveryMethod} (${s.deliveryFee}$)
• Location: ${s.city}

💰 ${usd.toFixed(2)}$ ≈ ${amount} ${symbol}
🏦 Wallet: \`${s.wallet}\`

⏱ Estimated delivery: ~30 minutes
✅ Scan the QR or copy the address.`.trim();

    await sendSafe(() => bot.sendChatAction(id, "upload_photo"));
    await sendSafe(() => bot.sendPhoto(id, qr, { caption: summary, parse_mode: "Markdown" }));

    if (paymentTimers[id]) clearTimeout(paymentTimers[id]);

    const timer = setTimeout(() => {
      console.warn(`⌛️ Payment expired: ${id}`);
      delete userSessions[id];
      delete paymentTimers[id];
    }, 30 * 60 * 1000);

    s.paymentTimer = timer;
    paymentTimers[id] = timer;

    return sendKeyboard(bot, id, "❓ *Was the payment completed?*", [
      [{ text: "✅ CONFIRM" }],
      [{ text: "❌ Cancel payment" }]
    ], userMessages);

  } catch (err) {
    console.error("❌ [handlePayment error]:", err.message);
    s.paymentInProgress = false;
    return sendAndTrack(bot, id, `❗️ Payment setup failed.\n*${err.message}*`, {
      parse_mode: "Markdown"
    }, userMessages);
  }
}

export async function handlePaymentCancel(bot, id, userMessages) {
  const s = userSessions[id];
  if (!s || s.step !== 8 || !s.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ No active payment to cancel.", {}, userMessages);
  }

  s.paymentInProgress = false;

  if (s.paymentTimer) {
    clearTimeout(s.paymentTimer);
    delete s.paymentTimer;
  }

  if (paymentTimers[id]) {
    clearTimeout(paymentTimers[id]);
    delete paymentTimers[id];
  }

  delete userSessions[id];

  await sendAndTrack(bot, id, "❌ Payment canceled. Returning to main menu...", {}, userMessages);
  return setTimeout(() => safeStart(bot, id), 300);
}

export async function handlePaymentConfirmation(bot, id, userMessages) {
  const s = userSessions[id];
  if (!(s && s.step === 9 && s.wallet && s.currency && s.expectedAmount)) {
    return sendAndTrack(bot, id, "⚠️ Invalid session. Use /start to begin again.", {}, userMessages);
  }

  try {
    await sendAndTrack(bot, id, "⏳ Verifying payment on the blockchain...", {}, userMessages);

    const symbol = normalizeCurrency(s.currency);
    const confirmed = await fetchWithRetry(() =>
      checkPayment(s.wallet, symbol, s.expectedAmount, bot)
    );

    if (!confirmed) {
      return sendKeyboard(bot, id, "❌ Payment not yet detected. Try again or cancel:", [
        [{ text: "✅ CONFIRM" }],
        [{ text: "❌ Cancel payment" }]
      ], userMessages);
    }

    if (s.paymentTimer) clearTimeout(s.paymentTimer);
    if (paymentTimers[id]) clearTimeout(paymentTimers[id]);
    delete s.paymentTimer;
    delete paymentTimers[id];

    userOrders[id] = (userOrders[id] || 0) + 1;

    await saveOrder(id, s.city, s.product.name, s.totalPrice).catch(err =>
      console.warn("⚠️ [saveOrder error]:", err.message)
    );

    await sendAndTrack(bot, id, "✅ Payment confirmed! Delivery is on the way...", {}, userMessages);

    if (BOT.ADMIN_ID && bot?.sendMessage) {
      await sendSafe(() =>
        bot.sendMessage(BOT.ADMIN_ID, `✅ New successful payment from \`${s.wallet}\``, {
          parse_mode: "Markdown"
        })
      );
    }

    return simulateDelivery(bot, id);
  } catch (err) {
    console.error("❌ [handlePaymentConfirmation error]:", err.message);
    return sendAndTrack(bot, id, "❗️ Blockchain check failed. Try again later.", {}, userMessages);
  }
}
