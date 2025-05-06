import { generateQR } from "../../utils/generateQR.js";
import { checkPayment } from "../../utils/cryptoChecker.js";
import { fetchCryptoPrice } from "../../utils/fetchCryptoPrice.js";
import { saveOrder } from "../../utils/saveOrder.js";
import { sendAndTrack, sendKeyboard } from "../../helpers/messageUtils.js";
import { finishOrder } from "./finalHandler.js";
import { userSessions, userOrders, paymentTimers } from "../../state/userState.js";

// Retry helper with exponential backoff
async function fetchWithRetry(apiCall, retries = 5, delay = 1000) {
  try {
    return await apiCall();
  } catch (error) {
    if (retries === 0) {
      console.error("❌ Final retry attempt failed.");
      throw error;
    }
    console.warn(`⚠️ API error. Retrying... (${retries} left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(apiCall, retries - 1, delay * 2);
  }
}

/**
 * Step 7 — Display QR and wait for payment
 */
export async function handlePayment(bot, id, userMessages) {
  const s = userSessions[id];

  if (!s || s.step !== 7 || s.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ Invalid or duplicate payment attempt. Please start again.", {}, userMessages);
  }

  s.paymentInProgress = true;

  try {
    const usd = parseFloat(s.totalPrice);
    const hasAllData = s.wallet && s.currency && s.product?.name && s.quantity && usd > 0;
    if (!hasAllData) throw new Error("Missing payment data");

    const rate = await fetchWithRetry(() => fetchCryptoPrice(s.currency));
    if (!rate || isNaN(rate) || rate <= 0) throw new Error("Invalid exchange rate");

    const amount = +(usd / rate).toFixed(6);
    s.expectedAmount = amount;

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

⏱ Delivery in ~30 minutes.
✅ Scan the QR or copy the address.`.trim();

    s.step = 8;

    await bot.sendChatAction(id, "upload_photo").catch(() => {});
    await bot.sendPhoto(id, qr, {
      caption: summary,
      parse_mode: "Markdown"
    });

    if (paymentTimers[id]) clearTimeout(paymentTimers[id]);

    const timer = setTimeout(() => {
      delete userSessions[id];
      delete paymentTimers[id];
      console.warn(`⌛️ Payment window expired: ${id}`);
    }, 30 * 60 * 1000);

    s.paymentTimer = timer;
    paymentTimers[id] = timer;

    return sendKeyboard(
      bot,
      id,
      "❓ *Was the payment completed?*",
      [
        [{ text: "✅ CONFIRM" }],
        [{ text: "❌ Cancel payment" }]
      ],
      userMessages
    );
  } catch (err) {
    console.error("❌ [handlePayment error]:", err.message);
    s.paymentInProgress = false;
    return sendAndTrack(bot, id, "❗️ Payment preparation failed. Please try again.", {}, userMessages);
  }
}

/**
 * Step 9 — Verify if payment was received
 */
export async function handlePaymentConfirmation(bot, id, userMessages) {
  const s = userSessions[id];
  const valid = s && s.step === 9 && s.wallet && s.currency && s.expectedAmount;

  if (!valid) {
    return sendAndTrack(bot, id, "⚠️ Invalid payment info. Please restart with /start.", {}, userMessages);
  }

  try {
    await sendAndTrack(bot, id, "⏳ Checking blockchain for payment...", {}, userMessages);

    const success = await checkPayment(s.wallet, s.currency, s.expectedAmount, bot);
    if (!success) {
      return sendAndTrack(bot, id, "❌ Payment not detected yet. Please check again later.", {}, userMessages);
    }

    if (s.paymentTimer) clearTimeout(s.paymentTimer);
    if (paymentTimers[id]) {
      clearTimeout(paymentTimers[id]);
      delete paymentTimers[id];
    }

    await sendAndTrack(bot, id, "✅ Payment confirmed!\nStarting delivery...", {}, userMessages);

    userOrders[id] = (userOrders[id] || 0) + 1;

    await saveOrder(id, s.city, s.product.name, s.totalPrice).catch(err =>
      console.warn("⚠️ [saveOrder error]:", err.message)
    );

    await sendAndTrack(adminBot, adminId, `✅ New successful payment from ${s.wallet}`);

    return await finishOrder(bot, id);
  } catch (err) {
    console.error("❌ [handlePaymentConfirmation error]:", err.message);
    return sendAndTrack(bot, id, "❗️ Error checking payment. Please try again later.", {}, userMessages);
  }
}

/**
 * Step 8 — Cancel payment and return to safe start
 */
export async function handlePaymentCancel(bot, id, userMessages) {
  const s = userSessions[id];

  if (s && s.step === 8 && s.paymentInProgress) {
    s.paymentInProgress = false;
    s.step = null;

    await sendAndTrack(bot, id, "❌ Payment canceled. Returning to start...", {}, userMessages);

    delete userSessions[id];
    delete paymentTimers[id];

    return await safeStart(bot, id);
  }

  return sendAndTrack(bot, id, "⚠️ Payment could not be canceled due to invalid step.", {}, userMessages);
}
