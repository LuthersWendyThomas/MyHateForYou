// 📦 core/handlers/paymentHandler.js | FINAL IMMORTAL v999999999
// FULL AI-DRIVEN QR LOGIC • STEP-SAFE • SESSION-SYNC • BULLETPROOF • FULLRESET INTEGRATED

import { getOrCreateQR } from "../../utils/generateQR.js"; // ✅ Tik šitą naudok
import { checkPayment } from "../../utils/cryptoChecker.js";
import { fetchCryptoPrice } from "../../utils/fetchCryptoPrice.js";
import { saveOrder } from "../../utils/saveOrder.js";
import {
  sendAndTrack,
  sendPhotoAndTrack,
  sendKeyboard
} from "../../helpers/messageUtils.js";
import { simulateDelivery } from "./deliveryHandler.js";
import { safeStart, resetSession } from "./finalHandler.js";
import {
  userSessions,
  userOrders,
  paymentTimers
} from "../../state/userState.js";
import { fullResetUserState } from "../sessionManager.js";
import { BOT, ALIASES } from "../../config/config.js";
import { MENU_BUTTONS } from "../../helpers/keyboardConstants.js";
import { sanitizeAmount } from "../../utils/fallbackPathUtils.js";

const TIMEOUT_MS = 30 * 60 * 1000;

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function normalizeSymbol(raw) {
  const key = String(raw || "").trim().toLowerCase();
  return (ALIASES[key] || key).toUpperCase();
}

function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}

async function getSafeRate(currency) {
  const symbol = normalizeSymbol(currency);
  const rate = await fetchCryptoPrice(symbol);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Invalid rate for ${symbol}`);
  return { rate, symbol };
}

async function safeSend(fn, ...args) {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn(...args);
    } catch (err) {
      if (String(err.message).includes("429")) {
        const delay = 500 + i * 700;
        console.warn(`⏳ Rate limit (${i + 1}) → retry in ${delay}ms`);
        await wait(delay);
      } else break;
    }
  }
  return null;
}

export async function handlePayment(bot, id, userMsgs, preGeneratedQR) {
  const session = userSessions[id];
  if (!session || session.step !== 7 || session.paymentInProgress) {
    return safeStart(bot, id);
  }

  session.paymentInProgress = true;

  try {
    const usd = Number(session.totalPrice) + Number(session.deliveryFee || 0);
    if (!session.wallet || !isValidAddress(session.wallet)) {
      throw new Error("❌ Invalid wallet. Please restart with /start.");
    }
    if (!session.currency || !session.product?.name || !session.quantity || !Number.isFinite(usd)) {
      throw new Error("Missing or invalid order details");
    }

    const { rate, symbol } = await getSafeRate(session.currency);
    const amountRaw = usd / rate;
    const amount = sanitizeAmount(amountRaw);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Calculated crypto amount is invalid");
    }

    session.expectedAmount = amount;
    session.step = 9;

    // ✅ Inform client instantly (no waiting lag)
    await sendAndTrack(bot, id, "💡 Preparing payment info...", {}, userMsgs);

    const qrBuffer = preGeneratedQR || await getOrCreateQRFromCache(symbol, amount, session.wallet);

    if (!isValidBuffer(qrBuffer)) {
      throw new Error(`QR code unavailable. Try again later.`);
    }

    if (process.env.DEBUG_MESSAGES === "true") {
      console.debug(`[handlePayment] UID=${id} AMOUNT=${amount} ${symbol}`);
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

    if (paymentTimers[id]) clearTimeout(paymentTimers[id]);
    const timer = setTimeout(async () => {
      console.warn(`⌛️ [payment timeout] User ${id}`);
      delete paymentTimers[id];
      await fullResetUserState(id);
    }, TIMEOUT_MS);

    session.paymentTimer = timer;
    paymentTimers[id] = timer;

    return sendKeyboard(bot, id, "❓ *Has the payment completed?*", [
      [{ text: MENU_BUTTONS.CONFIRM.text }],
      [{ text: MENU_BUTTONS.CANCEL.text }]
    ], userMsgs, { parse_mode: "Markdown" });

  } catch (err) {
    console.error("❌ [handlePayment error]:", err.message || err);
    await fullResetUserState(id);
    return sendAndTrack(bot, id, `❗️ Payment failed:\n*${err.message}*`, {
      parse_mode: "Markdown"
    }, userMsgs);
  }
}

export async function handlePaymentCancel(bot, id, userMsgs) {
  const session = userSessions[id];
  if (!session || session.step !== 9 || !session.paymentInProgress) {
    return sendAndTrack(bot, id, "⚠️ No active payment to cancel.", {}, userMsgs);
  }

  clearTimeout(session.paymentTimer);
  delete paymentTimers[id];

  await sendAndTrack(bot, id, "❌ Payment canceled. Returning to main menu...", {}, userMsgs);
  await fullResetUserState(id); // ✅ saugiai
  return safeStart(bot, id);
}

export async function handlePaymentConfirmation(bot, id, userMsgs) {
  const session = userSessions[id];
  if (
    !session || session.step !== 9 || !isValidAddress(session.wallet) ||
    !session.currency || !Number.isFinite(session.expectedAmount)
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
    return await simulateDelivery(bot, id, session.deliveryMethod, userMsgs); // ✅ await pridėtas

  } catch (err) {
    console.error("❌ [handlePaymentConfirmation error]:", err.message || err);
    return sendAndTrack(bot, id, "❗️ Verification failed. Please try again later.", {}, userMsgs);
  }
}

export async function sendAdminPing(msg) {
  try {
    const adminId = process.env.ADMIN_ID;
    if (!adminId) return;
    await BOT.INSTANCE.sendMessage(adminId, msg, { parse_mode: "Markdown" });
  } catch (e) {
    console.warn("⚠️ [sendAdminPing failed]", e.message);
  }
}
