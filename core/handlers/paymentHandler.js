// 📦 core/handlers/paymentHandler.js | IMMORTAL FINAL v1_11111111111 — ULTRA BULLETPROOF GODMODE

import { generateQR } from "../../utils/generateQR.js";
import { checkPayment } from "../../utils/cryptoChecker.js";
import { fetchCryptoPrice } from "../../utils/fetchCryptoPrice.js";
import { saveOrder } from "../../utils/saveOrder.js";
import { sendAndTrack, sendKeyboard } from "../../helpers/messageUtils.js";
import { simulateDelivery } from "./deliveryHandler.js";
import { safeStart } from "./finalHandler.js";
import { userSessions, userOrders, paymentTimers } from "../../state/userState.js";
import { BOT } from "../../config/config.js";

const SUPPORTED = {
  BTC: { gecko: "bitcoin", coincap: "bitcoin" },
  ETH: { gecko: "ethereum", coincap: "ethereum" },
  MATIC: { gecko: "polygon-pos", coincap: "polygon" },
  SOL: { gecko: "solana", coincap: "solana" }
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

async function sendSafe(botMethod, ...args) {
  for (let i = 0; i < 3; i++) {
    try {
      return await botMethod(...args);
    } catch (err) {
      if (err.response?.statusCode === 429 || err.message?.includes("429")) {
        const delay = (i + 1) * 2000;
        console.warn(`⏳ Telegram rate limited → waiting ${delay}ms`);
        await wait(delay);
        continue;
      }
      console.warn("⚠️ [sendSafe error]:", err.message || err);
    }
  }
  return null;
}

async function getSafeRate(currency) {
  try {
    const upper = currency.toUpperCase();
    const coin = SUPPORTED[upper];
    if (!coin) throw new Error(`Unsupported currency: "${currency}"`);

    const rate = await fetchWithRetry(() => fetchCryptoPrice(coin.gecko));
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Invalid rate for "${currency}"`);
    }
    return rate;
  } catch (err) {
    throw new Error(`❌ Failed to fetch rate: ${err.message}`);
  }
}

export async function handlePayment(bot, id, userMessages) {
  const s = userSessions[id];
  if (!s || s.step !== 7 || s.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ Invalid or duplicate payment attempt.", {}, userMessages);
  }

  s.paymentInProgress = true;

  try {
    const usd = parseFloat(s.totalPrice);
    if (!s.wallet || !s.currency || !s.product?.name || !s.quantity || !Number.isFinite(usd) || usd <= 0) {
      throw new Error("Missing or invalid payment session data");
    }

    const upperCurrency = s.currency.toUpperCase();
    if (!SUPPORTED[upperCurrency]) {
      throw new Error(`Unsupported currency "${upperCurrency}".`);
    }

    const rate = await getSafeRate(upperCurrency);
    const amount = +(usd / rate).toFixed(6);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid crypto amount calculated");
    }

    s.expectedAmount = amount;
    const qr = await generateQR(upperCurrency, amount, s.wallet);
    if (!qr || !(qr instanceof Buffer)) throw new Error("QR generation failed");

    s.step = 8;

    const summary = `
💸 *Payment summary:*

• Product: ${s.product.name}
• Quantity: ${s.quantity}
• Delivery: ${s.deliveryMethod} (${s.deliveryFee}$)
• Location: ${s.city}

💰 ${usd.toFixed(2)}$ ≈ ${amount} ${upperCurrency}
🏦 Wallet: \`${s.wallet}\`

⏱ Estimated delivery: ~30 minutes
✅ Scan the QR or copy the address.`.trim();

    await sendSafe(() => bot.sendChatAction(id, "upload_photo"));
    await sendSafe(() => bot.sendPhoto(id, qr, { caption: summary, parse_mode: "Markdown" }));

    if (paymentTimers[id]) clearTimeout(paymentTimers[id]);

    const timer = setTimeout(() => {
      console.warn(`⌛️ Payment expired: ${id}`);
      delete paymentTimers[id];
      delete userSessions[id];
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

  try {
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
  } catch (err) {
    console.error("❌ [handlePaymentCancel error]:", err.message);
    return safeStart(bot, id);
  }
}

export async function handlePaymentConfirmation(bot, id, userMessages) {
  const s = userSessions[id];
  const valid = s && s.step === 9 && s.wallet && s.currency && s.expectedAmount;

  if (!valid) {
    return sendAndTrack(bot, id, "⚠️ Invalid session. Use /start to begin again.", {}, userMessages);
  }

  try {
    await sendAndTrack(bot, id, "⏳ Verifying payment on the blockchain...", {}, userMessages);

    const confirmed = await fetchWithRetry(() => checkPayment(s.wallet, s.currency, s.expectedAmount, bot));
    if (!confirmed) {
      return sendKeyboard(bot, id, "❌ Payment not yet detected. Try again or cancel:", [
        [{ text: "✅ CONFIRM" }],
        [{ text: "❌ Cancel payment" }]
      ], userMessages);
    }

    if (s.paymentTimer) clearTimeout(s.paymentTimer);
    if (paymentTimers[id]) clearTimeout(paymentTimers[id]);

    delete paymentTimers[id];
    delete s.paymentTimer;

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
