import { generateQR } from "../../utils/generateQR.js";
import { checkPayment } from "../../utils/cryptoChecker.js";
import { fetchCryptoPrice } from "../../utils/fetchCryptoPrice.js";
import { saveOrder } from "../../utils/saveOrder.js";
import { sendAndTrack, sendKeyboard } from "../../helpers/messageUtils.js";
import { simulateDelivery } from "./deliveryHandler.js";
import { userSessions, userOrders, paymentTimers } from "../../state/userState.js";
import { finishOrder } from "./finalHandler.js";

/**
 * Žingsnis 7 — rodo QR kodą ir laukia apmokėjimo
 */
export async function handlePayment(bot, id, userMessages) {
  const s = userSessions[id];
  if (!s || s.step !== 7) {
    return sendAndTrack(bot, id, "⚠️ Invalid step. Please try again.", {}, userMessages);
  }

  if (s.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ Payment is already in progress. Please wait...", {}, userMessages);
  }

  s.paymentInProgress = true;

  try {
    const eur = parseFloat(s.totalPrice);
    const hasAllData =
      s.wallet && s.currency && s.product?.name && s.quantity && eur && eur > 0;

    if (!hasAllData) throw new Error("Missing or invalid data for payment.");

    const rate = await fetchCryptoPrice(s.currency);
    if (!rate || isNaN(rate) || rate <= 0) throw new Error("Failed to fetch exchange rate.");

    const amount = +(eur / rate).toFixed(6);
    s.expectedAmount = amount;

    const qr = await generateQR(s.currency, amount, s.wallet);
    if (!qr || !(qr instanceof Buffer)) throw new Error("Failed to generate QR code.");

    const summary = `
💸 *Payment summary:*

• Product: ${s.product.name}
• Quantity: ${s.quantity}
• Delivery: ${s.deliveryMethod} (${s.deliveryFee}€)
• Location: ${s.city}

💰 ${eur.toFixed(2)}€ ≈ ${amount} ${s.currency}
🏦 Wallet: \`${s.wallet}\`

⏱ Estimated delivery in ~30 minutes.
✅ Pay by scanning the QR or copy the wallet address.`.trim();

    // 🛠️ FIXAS — žingsnis nustatomas PRIEŠ siunčiant QR, kad net jei QR siuntimas stringa — flow toliau veiktų
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
      console.warn(`⌛️ Mokėjimo langas baigėsi: ${id}`);
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
    console.error("❌ [handlePayment klaida]:", err.message);
    s.paymentInProgress = false;
    return sendAndTrack(bot, id, "❗️ Error preparing payment. Please try again.", {}, userMessages);
  }
}

/**
 * Žingsnis 9 — tikrina ar mokėjimas gautas
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

    if (s.paymentTimer) clearTimeout(s.paymentTimer);
    if (paymentTimers[id]) {
      clearTimeout(paymentTimers[id]);
      delete paymentTimers[id];
    }

    await sendAndTrack(bot, id, "✅ Mokėjimas patvirtintas!\nPristatymas vykdomas...", {}, userMessages);

    userOrders[id] = (userOrders[id] || 0) + 1;

    await saveOrder(id, s.city, s.product.name, s.totalPrice).catch(err =>
      console.warn("⚠️ [saveOrder klaida]:", err.message)
    );

    return await finishOrder(bot, id);

  } catch (err) {
    console.error("❌ [handlePaymentConfirmation klaida]:", err.message);
    return sendAndTrack(bot, id, "❗️ Error verifying payment. Please try again later.", {}, userMessages);
  }
}
