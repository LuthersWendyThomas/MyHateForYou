// 📦 core/handlers/paymentHandler.js | IMMORTAL DIAMONDLOCK v999999999999999999999x
// 24/7 PAYMENT CORE • AUTO QR • BLOCKCHAIN VERIFY • MAX-RETRY • ULTRA ERROR SHIELD

import { generateQR } from "../../utils/generateQR.js";
import { checkPayment } from "../../utils/cryptoChecker.js";
import { fetchCryptoPrice } from "../../utils/fetchCryptoPrice.js";
import { saveOrder } from "../../utils/saveOrder.js";
import { sendAndTrack, sendKeyboard } from "../../helpers/messageUtils.js";
import { simulateDelivery } from "./deliveryHandler.js";
import { safeStart } from "./finalHandler.js";
import { userSessions, userOrders, paymentTimers } from "../../state/userState.js";
import { BOT, ALIASES } from "../../config/config.js";
import { MENU_BUTTONS } from "../../helpers/keyboardConstants.js";

const SUPPORTED = {
  BTC: { gecko: "bitcoin", coincap: "bitcoin" },
  ETH: { gecko: "ethereum", coincap: "ethereum" },
  MATIC: { gecko: "matic-network", coincap: "matic" },
  SOL: { gecko: "solana", coincap: "solana" }
};

const TIMEOUT_MS = 30 * 60 * 1000; // 30 min

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function normalizeCurrency(c) {
  return ALIASES[String(c).toLowerCase()] || String(c).toUpperCase();
}

async function fetchWithRetry(fn, retries = 4, delay = 1200) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      if (i > 0) await wait(i * delay);
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️ [Retry ${i + 1}] ${err.message}`);
    }
  }
  throw lastErr;
}

async function getSafeRate(currency) {
  const symbol = normalizeCurrency(currency);
  const meta = SUPPORTED[symbol];
  if (!meta) throw new Error(`Unsupported currency: ${symbol}`);

  const rate = await fetchWithRetry(() => fetchCryptoPrice(symbol));
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Invalid rate for ${symbol}`);
  return { rate, symbol };
}

async function sendSafe(fn, ...args) {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn(...args);
    } catch (err) {
      if (String(err.message || "").includes("429")) {
        const delay = 1200 + i * 800;
        console.warn(`⏳ Rate limit (${i + 1}) → waiting ${delay}ms`);
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
 * 💸 Triggers payment flow: QR, amount, retry protection
 */
export async function handlePayment(bot, id, userMsgs) {
  const session = userSessions[id];
  if (!session || session.step !== 7 || session.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ Invalid or duplicate payment.", {}, userMsgs);
  }

  session.paymentInProgress = true;

  try {
    const usd = +session.totalPrice;
    if (!session.wallet || !session.currency || !session.product?.name || !session.quantity || !isFinite(usd)) {
      throw new Error("Invalid session data");
    }

    const { rate, symbol } = await getSafeRate(session.currency);
    const amount = +(usd / rate).toFixed(6);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid crypto amount");

    session.expectedAmount = amount;
    session.step = 8;

    const qr = await generateQR(symbol, amount, session.wallet);
    if (!qr) throw new Error("QR generation failed");

    const text = `
💸 *Payment summary:*

• Product: *${session.product.name}*
• Quantity: *${session.quantity}*
• Delivery: *${session.deliveryMethod}* (${session.deliveryFee}$)
• City: *${session.city}*

💰 ${usd.toFixed(2)}$ ≈ *${amount} ${symbol}*
🏦 Wallet: \`${session.wallet}\`

⏱ ETA: ~30 minutes  
✅ Scan QR or copy address
`.trim();

    await sendSafe(() => bot.sendChatAction(id, "upload_photo"));
    await sendSafe(() => bot.sendPhoto(id, qr, { caption: text, parse_mode: "Markdown" }));

    if (paymentTimers[id]) clearTimeout(paymentTimers[id]);

    const timer = setTimeout(() => {
      console.warn(`⌛️ [payment timeout] → ${id}`);
      delete paymentTimers[id];
      delete userSessions[id];
    }, TIMEOUT_MS);

    session.paymentTimer = timer;
    paymentTimers[id] = timer;

    return sendKeyboard(bot, id, "❓ *Was the payment completed?*", [
      { text: MENU_BUTTONS.CONFIRM.text },
      { text: MENU_BUTTONS.CANCEL.text }
    ], userMsgs, { parse_mode: "Markdown" });

  } catch (err) {
    console.error("❌ [handlePayment error]:", err.message || err);
    session.paymentInProgress = false;
    return sendAndTrack(bot, id, `❗️ Payment failed.\n*${err.message}*`, { parse_mode: "Markdown" }, userMsgs);
  }
}

/**
 * ❌ Cancels payment & resets session
 */
export async function handlePaymentCancel(bot, id, userMsgs) {
  const session = userSessions[id];
  if (!session || session.step !== 8 || !session.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ No active payment to cancel.", {}, userMsgs);
  }

  clearTimeout(session.paymentTimer);
  delete paymentTimers[id];
  delete userSessions[id];

  await sendAndTrack(bot, id, "❌ Payment canceled. Returning to main menu...", {}, userMsgs);
  return setTimeout(() => safeStart(bot, id), 500);
}

/**
 * ✅ Confirms blockchain payment and starts delivery
 */
export async function handlePaymentConfirmation(bot, id, userMsgs) {
  const session = userSessions[id];
  if (!session || session.step !== 9 || !session.wallet || !session.currency || !session.expectedAmount) {
    return sendAndTrack(bot, id, "⚠️ Invalid session. Use /start to retry.", {}, userMsgs);
  }

  try {
    await sendAndTrack(bot, id, "⏳ Checking payment on blockchain...", {}, userMsgs);

    const symbol = normalizeCurrency(session.currency);
    const paid = await fetchWithRetry(() =>
      checkPayment(session.wallet, symbol, session.expectedAmount, bot)
    );

    if (!paid) {
      return sendKeyboard(bot, id, "❌ Payment not found. Try again:", [
        { text: MENU_BUTTONS.CONFIRM.text },
        { text: MENU_BUTTONS.CANCEL.text }
      ], userMsgs, { parse_mode: "Markdown" });
    }

    clearTimeout(session.paymentTimer);
    delete paymentTimers[id];
    delete session.paymentInProgress;
    delete session.expectedAmount;

    userOrders[id] = (userOrders[id] || 0) + 1;

    await saveOrder(id, session.city, session.product.name, session.totalPrice).catch(err =>
      console.warn("⚠️ [saveOrder failed]", err.message)
    );

    await sendAndTrack(bot, id, "✅ Payment confirmed! Delivery starting...", {}, userMsgs);

    if (BOT.ADMIN_ID) {
      await sendSafe(() =>
        bot.sendMessage(BOT.ADMIN_ID, `✅ Payment received → \`${session.wallet}\``, {
          parse_mode: "Markdown"
        })
      );
    }

    return simulateDelivery(bot, id);

  } catch (err) {
    console.error("❌ [handlePaymentConfirmation error]:", err.message || err);
    return sendAndTrack(bot, id, "❗️ Payment verification failed. Try again later.", {}, userMsgs);
  }
}
