import { generateQR } from "../../utils/generateQR.js";
import { checkPayment } from "../../utils/cryptoChecker.js";
import { fetchCryptoPrice } from "../../utils/fetchCryptoPrice.js";
import { saveOrder } from "../../utils/saveOrder.js";
import { sendAndTrack, sendKeyboard } from "../../helpers/messageUtils.js";
import { simulateDelivery } from "./deliveryHandler.js";
import { userSessions, userOrders, paymentTimers } from "../../state/userState.js";
import { finishOrder } from "./finalHandler.js";

// Helper function to handle retries for API calls with exponential backoff
async function fetchWithRetry(apiCall, retries = 5, delay = 1000) {
  try {
    return await apiCall();
  } catch (error) {
    if (retries === 0) {
      console.error("❌ Final retry attempt failed.");
      throw error;
    }
    console.warn(`⚠️ API request failed. Retrying... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(apiCall, retries - 1, delay * 2); // Exponential backoff
  }
}

// Preventing session duplication
function isPaymentInProgress(s) {
  return s && s.paymentInProgress;
}

/**
 * Step 7 — shows the QR code and waits for payment
 */
export async function handlePayment(bot, id, userMessages) {
  const s = userSessions[id];

  // Ensure that the payment is in the right step and no other payment is in progress
  if (!s || s.step !== 7 || isPaymentInProgress(s)) {
    return sendAndTrack(bot, id, "⚠️ Invalid or duplicate payment attempt. Please try again.", {}, userMessages);
  }

  s.paymentInProgress = true;  // Lock payment process to avoid double payments

  try {
    const usd = parseFloat(s.totalPrice);
    const hasAllData =
      s.wallet && s.currency && s.product?.name && s.quantity && usd && usd > 0;

    if (!hasAllData) throw new Error("Missing or invalid data for payment");

    // Fetch the crypto price with retry mechanism
    const rate = await fetchWithRetry(() => fetchCryptoPrice(s.currency), 5, 1000);
    if (!rate || isNaN(rate) || rate <= 0) throw new Error("Failed to fetch exchange rate");

    const amount = +(usd / rate).toFixed(6);
    s.expectedAmount = amount;

    const qr = await generateQR(s.currency, amount, s.wallet);
    if (!qr || !(qr instanceof Buffer)) throw new Error("Failed to generate QR code");

    const summary = `
💸 *Payment summary:*

• Product: ${s.product.name}
• Quantity: ${s.quantity}
• Delivery: ${s.deliveryMethod} (${s.deliveryFee}$)
• Location: ${s.city}

💰 ${usd.toFixed(2)}$ ≈ ${amount} ${s.currency}
🏦 Wallet: \`${s.wallet}\`

⏱ Estimated delivery in ~30 minutes.
✅ Pay by scanning the QR or copy the wallet address.`.trim();

    // 🛠️ FIX: Set step before sending QR to ensure flow continues if QR sending fails
    s.step = 8;

    await bot.sendChatAction(id, "upload_photo").catch(() => {});
    await bot.sendPhoto(id, qr, {
      caption: summary,
      parse_mode: "Markdown"
    });

    // Clear any existing payment timers to prevent multiple payments
    if (paymentTimers[id]) clearTimeout(paymentTimers[id]);

    const timer = setTimeout(() => {
      delete userSessions[id];
      delete paymentTimers[id];
      console.warn(`⌛️ Payment window has ended: ${id}`);
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
    return sendAndTrack(bot, id, "❗️ Error preparing payment. Please try again.", {}, userMessages);
  }
}

/**
 * Step 9 — verifies if the payment was received
 */
export async function handlePaymentConfirmation(bot, id, userMessages) {
  const s = userSessions[id];
  const valid =
    s && s.step === 9 && s.wallet && s.currency && s.expectedAmount;

  if (!valid) {
    return sendAndTrack(bot, id, "⚠️ Invalid payment information. Please restart with /start.", {}, userMessages);
  }

  try {
    await sendAndTrack(bot, id, "⏳ Verifying payment on the blockchain...", {}, userMessages);

    const success = await checkPayment(s.wallet, s.currency, s.expectedAmount, bot);
    if (!success) {
      return sendAndTrack(bot, id, "❌ Payment not received yet. Please check again later.", {}, userMessages);
    }

    // Clear any existing payment timer
    if (s.paymentTimer) clearTimeout(s.paymentTimer);
    if (paymentTimers[id]) {
      clearTimeout(paymentTimers[id]);
      delete paymentTimers[id];
    }

    await sendAndTrack(bot, id, "✅ Payment confirmed!\nDelivery in progress...", {}, userMessages);

    // Increment the user order count
    userOrders[id] = (userOrders[id] || 0) + 1;

    await saveOrder(id, s.city, s.product.name, s.totalPrice).catch(err =>
      console.warn("⚠️ [saveOrder error]:", err.message)
    );

    return await finishOrder(bot, id);

  } catch (err) {
    console.error("❌ [handlePaymentConfirmation error]:", err.message);
    return sendAndTrack(bot, id, "❗️ Error verifying payment. Please try again later.", {}, userMessages);
  }
}

/**
 * Step 8 — Checks for confirmation or cancel of the payment
 */
export async function handlePaymentCancel(bot, id, userMessages) {
  const s = userSessions[id];

  // If the user cancels the payment, reset the session
  if (s && s.step === 8 && s.paymentInProgress) {
    // Reset the session data to allow a new payment to be started
    s.paymentInProgress = false;
    s.step = 1; // Back to the first step, or you can use `safeStart()` to restart the process.

    // Notify the user that the payment process has been cancelled
    await sendAndTrack(bot, id, "❌ Mokėjimas atšauktas. Grįžtate į pradžią.", {}, userMessages);

    // Clear session and payment timers
    delete userSessions[id];
    delete paymentTimers[id];

    // Optionally, you can trigger a safe start for a new payment session
    return await safeStart(bot, id);  // Starts fresh from step 1
  }

  return sendAndTrack(bot, id, "⚠️ Mokėjimas nebuvo atšauktas, nes proceso žingsnis netinkamas.", {}, userMessages);
}
