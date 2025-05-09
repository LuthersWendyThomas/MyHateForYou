// 📦 utils/generateQR.js | IMMORTAL v3.0 — BULLETPROOF INLINE+QR EDITION

import QRCode from "qrcode";
import { WALLETS } from "../config/config.js";

/**
 * ✅ Generates QR code PNG buffer for payment
 */
export async function generateQR(currency, amount, overrideAddress) {
  try {
    if (!currency || amount === undefined || amount === null) {
      console.warn("⚠️ [generateQR] Missing currency or amount.");
      return null;
    }

    const cleanCurrency = String(currency).trim().toUpperCase();
    const address = String(overrideAddress || WALLETS[cleanCurrency] || "").trim();
    const parsedAmount = parseFloat(amount);

    if (!address || address.length < 8 || !isValidAddress(address)) {
      console.warn(`[generateQR] Invalid or empty address: "${address}"`);
      return null;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      console.warn(`[generateQR] Invalid amount: ${amount}`);
      return null;
    }

    const formatted = parsedAmount.toFixed(6);
    const uri = `${cleanCurrency.toLowerCase()}:${address}?amount=${formatted}&label=BalticPharmacyBot&message=Order`;

    const buffer = await QRCode.toBuffer(uri, {
      type: "png",
      width: 180,
      margin: 1,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });

    if (!buffer || !(buffer instanceof Buffer)) {
      throw new Error("QR generated in incorrect format");
    }

    if (process.env.DEBUG_MESSAGES === "true") {
      console.log(`✅ [generateQR] QR created for ${cleanCurrency} → ${formatted}`);
    }

    return buffer;
  } catch (err) {
    console.error("❌ [generateQR error]:", err.message || err);
    return null;
  }
}

/**
 * ✅ Inline message + copy button (for after QR)
 */
export function generatePaymentMessageWithButton(currency, amount, overrideAddress = null) {
  const cleanCurrency = String(currency || "").toUpperCase();
  const parsedAmount = parseFloat(amount);
  const formattedAmount = Number.isFinite(parsedAmount)
    ? parsedAmount.toFixed(6)
    : "?.??????";

  const address = String(overrideAddress || WALLETS[cleanCurrency] || "").trim();
  const valid = isValidAddress(address) ? address : "[Invalid address]";

  const text = `
💳 *Payment details:*

• Network: *${cleanCurrency}*
• Amount: *${formattedAmount} ${cleanCurrency}*
• Address: \`${valid}\`

⏱️ *Expected payment within 30 minutes.*
✅ Use the QR code or copy the address.
  `.trim();

  return {
    message: text,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Copy address", callback_data: `copy:${valid}` }]
      ]
    }
  };
}

/**
 * ✅ Simple but strict crypto address format validation
 */
function isValidAddress(addr) {
  return typeof addr === "string" &&
    /^[a-zA-Z0-9]{8,}$/.test(addr);
}
