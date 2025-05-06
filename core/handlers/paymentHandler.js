import { generateQR } from "../../utils/generateQR.js";
import { checkPayment } from "../../utils/cryptoChecker.js";
import { fetchCryptoPrice } from "../../utils/fetchCryptoPrice.js";
import { saveOrder } from "../../utils/saveOrder.js";
import { sendAndTrack, sendKeyboard } from "../../helpers/messageUtils.js";
import { finishOrder, safeStart } from "./finalHandler.js";
import { userSessions, userOrders, paymentTimers } from "../../state/userState.js";

// Retry with exponential backoff
async function fetchWithRetry(apiCall, retries = 5, delay = 1000) {
  try {
    return await apiCall();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(r => setTimeout(r, delay));
    return fetchWithRetry(apiCall, retries - 1, delay * 2);
  }
}

/**
 * Step 7 — Show QR and wait for payment
 */
export async function handlePayment(bot, id, userMessages) {
  const s = userSessions[id];
  if (!s || s.step !== 7 || s.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ Invalid or duplicate payment attempt. Please start again.", {}, userMessages);
  }

  s.paymentInProgress = true;

  try {
    const usd = parseFloat(s.totalPrice);
    if (!(s.wallet && s.currency && s.product?.name && s.quantity && usd > 0)) {
      throw new Error("Missing or invalid payment data");
    }

    const rate = await fetchWithRetry(() => fetchCryptoPrice(s.currency));
    if (!rate || isNaN(rate) || rate <= 0) throw new Error("Exchange rate error");

    const amount = +(usd / rate).toFixed(6);
    s.expectedAmount = amount;
    s.step = 8;

    const qr = await generateQR(s.currency, amount, s.wallet);
    if (!qr || !(qr instanceof Buffer)) throw new Error("QR generation failed");

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
      delete userSessions[id];
      delete paymentTimers[id];
      console.warn(`⌛️ Payment expired: ${id}`);
    }, 30 * 60 * 1000);

    s.paymentTimer = timer;
    paymentTimers[id] = timer;

    return sendKeyboard(bot, id, "❓ *Was the payment completed?*", [
      [{ text: "✅ CONFIRM" }],
      [{ text: "❌ Cancel payment" }]
    ], userMessages);
  } catch (err) {
    console.error("❌ [handlePayment]:", err.message);
    s.paymentInProgress = false;
    return sendAndTrack(bot, id, "❗️ Payment preparation failed. Try again.", {}, userMessages);
  }
}

/**
 * Step 8 — Cancel at any point (guaranteed safe reset)
 */
export async function handlePaymentCancel(bot, id, userMessages) {
  const s = userSessions[id];

  if (s && s.step === 8 && s.paymentInProgress) {
    try {
      s.paymentInProgress = false;
      s.step = null;

      if (s.paymentTimer) clearTimeout(s.paymentTimer);
      if (paymentTimers[id]) {
        clearTimeout(paymentTimers[id]);
        delete paymentTimers[id];
      }

      delete userSessions[id];

      await sendAndTrack(bot, id, "❌ Payment canceled. Returning to main menu.", {}, userMessages);
      return await safeStart(bot, id);
    } catch (err) {
      console.error("❌ [handlePaymentCancel]:", err.message);
      return await safeStart(bot, id); // Always fallback safely
    }
  }

  return sendAndTrack(bot, id, "⚠️ Payment cancel failed. Invalid step.", {}, userMessages);
}

/**
 * Step 9 — Confirm blockchain payment and proceed to delivery
 */
export async function handlePaymentConfirmation(bot, id, userMessages) {
  const s = userSessions[id];
  const valid = s && s.step === 9 && s.wallet && s.currency && s.expectedAmount;

  if (!valid) {
    return sendAndTrack(bot, id, "⚠️ Invalid payment session. Restart with /start.", {}, userMessages);
  }

  try {
    await sendAndTrack(bot, id, "⏳ Verifying payment on the blockchain...", {}, userMessages);
    const success = await checkPayment(s.wallet, s.currency, s.expectedAmount, bot);

    if (!success) {
      return sendKeyboard(bot, id, "❌ Payment not detected yet.\nCheck again or cancel.", [
        [{ text: "✅ CONFIRM" }],
        [{ text: "❌ Cancel payment" }]
      ], userMessages);
    }

    if (s.paymentTimer) clearTimeout(s.paymentTimer);
    if (paymentTimers[id]) {
      clearTimeout(paymentTimers[id]);
      delete paymentTimers[id];
    }

    await sendAndTrack(bot, id, "✅ Payment confirmed! Delivery is on its way...", {}, userMessages);
    userOrders[id] = (userOrders[id] || 0) + 1;

    await saveOrder(id, s.city, s.product.name, s.totalPrice).catch(err =>
      console.warn("⚠️ [saveOrder error]:", err.message)
    );

    await sendAndTrack(adminBot, adminId, `✅ New successful payment from ${s.wallet}`);
    return await finishOrder(bot, id);
  } catch (err) {
    console.error("❌ [handlePaymentConfirmation]:", err.message);
    return sendAndTrack(bot, id, "❗️ Error verifying payment. Try again later.", {}, userMessages);
  }
}
