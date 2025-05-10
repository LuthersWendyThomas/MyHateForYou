import { generateQR } from "../../utils/generateQR.js";
import { checkPayment } from "../../utils/cryptoChecker.js";
import { fetchCryptoPrice } from "../../utils/fetchCryptoPrice.js";
import { saveOrder } from "../../utils/saveOrder.js";
import { sendAndTrack, sendKeyboard } from "../../helpers/messageUtils.js";
import { simulateDelivery } from "./deliveryHandler.js";
import { safeStart } from "./finalHandler.js";
import { userSessions, userOrders, paymentTimers } from "../../state/userState.js";
import { BOT } from "../../config/config.js";

// 🔁 Retry with exponential backoff
async function fetchWithRetry(apiCall, retries = 5, delay = 1000) {
  try {
    return await apiCall();
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise(res => setTimeout(res, delay));
    return fetchWithRetry(apiCall, retries - 1, delay * 2);
  }
}

// ✅ Exchange rate handler with proper error isolation
async function getSafeRate(currency) {
  try {
    const rate = await fetchWithRetry(() => fetchCryptoPrice(currency));
    if (!rate || isNaN(rate) || rate <= 0) {
      throw new Error(`Exchange rate unavailable for "${currency}"`);
    }
    return rate;
  } catch (err) {
    throw new Error(`❌ Failed to fetch exchange rate for ${currency}: ${err.message}`);
  }
}

/**
 * 🧾 Step 7 — Generate QR and await payment
 */
export async function handlePayment(bot, id, userMessages) {
  const s = userSessions[id];
  if (!s || s.step !== 7 || s.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ Invalid or duplicate payment attempt. Please start again.", {}, userMessages);
  }

  s.paymentInProgress = true;

  try {
    const usd = parseFloat(s.totalPrice);
    if (!s.wallet || !s.currency || !s.product?.name || !s.quantity || isNaN(usd) || usd <= 0) {
      throw new Error("Missing or invalid payment data");
    }

    const rate = await getSafeRate(s.currency);
    const amount = +(usd / rate).toFixed(6);
    s.expectedAmount = amount;

    const qr = await generateQR(s.currency, amount, s.wallet);
    if (!qr || !(qr instanceof Buffer)) throw new Error("QR generation failed");

    s.step = 8;

    const summary = `
💸 *Payment summary:*

• Product: ${s.product.name}
• Quantity: ${s.quantity}
• Delivery: ${s.deliveryMethod} (${s.deliveryFee}$)
• Location: ${s.city}

💰 ${usd.toFixed(2)}$ ≈ ${amount} ${s.currency}
🏦 Wallet: \`${s.wallet}\`

⏱ Estimated delivery: ~30 minutes
✅ Scan the QR or copy the address.`.trim();

    await bot.sendChatAction(id, "upload_photo").catch(() => {});
    await bot.sendPhoto(id, qr, { caption: summary, parse_mode: "Markdown" });

    if (paymentTimers[id]) clearTimeout(paymentTimers[id]);

    const timer = setTimeout(() => {
      console.warn(`⌛️ Payment expired: ${id}`);
      if (paymentTimers[id]) delete paymentTimers[id];
      if (userSessions[id]) delete userSessions[id];
    }, 30 * 60 * 1000); // 30 min

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

/**
 * 🛑 Step 8 — Cancel payment
 */
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

/**
 * ✅ Step 9 — Confirm payment on-chain and start delivery
 */
export async function handlePaymentConfirmation(bot, id, userMessages) {
  const s = userSessions[id];
  const valid = s && s.step === 9 && s.wallet && s.currency && s.expectedAmount;

  if (!valid) {
    return sendAndTrack(bot, id, "⚠️ Invalid session. Use /start to begin again.", {}, userMessages);
  }

  try {
    await sendAndTrack(bot, id, "⏳ Verifying payment on the blockchain...", {}, userMessages);

    const confirmed = await checkPayment(s.wallet, s.currency, s.expectedAmount, bot);
    if (!confirmed) {
      return sendKeyboard(bot, id, "❌ Payment not yet detected. Try again or cancel:", [
        [{ text: "✅ CONFIRM" }],
        [{ text: "❌ Cancel payment" }]
      ], userMessages);
    }

    if (s.paymentTimer) {
      clearTimeout(s.paymentTimer);
      delete s.paymentTimer;
    }

    if (paymentTimers[id]) {
      clearTimeout(paymentTimers[id]);
      delete paymentTimers[id];
    }

    userOrders[id] = (userOrders[id] || 0) + 1;

    await saveOrder(id, s.city, s.product.name, s.totalPrice).catch(err =>
      console.warn("⚠️ [saveOrder error]:", err.message)
    );

    await sendAndTrack(bot, id, "✅ Payment confirmed! Delivery is on the way...", {}, userMessages);

    const adminId = String(BOT.ADMIN_ID || "");
    if (adminId && bot?.sendMessage) {
      await sendAndTrack(bot, adminId, `✅ New successful payment from \`${s.wallet}\``, { parse_mode: "Markdown" });
    }

    return simulateDelivery(bot, id);

  } catch (err) {
    console.error("❌ [handlePaymentConfirmation error]:", err.message);
    return sendAndTrack(bot, id, "❗️ Blockchain check failed. Try again later.", {}, userMessages);
  }
}
