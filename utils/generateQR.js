// 📦 utils/generateQR.js | BalticPharma V2 — IMMORTAL SYNCED v2025.5.1 FINAL FIX

import QRCode from "qrcode";
import { WALLETS } from "../config/config.js";

/**
 * Generates a QR image for crypto payment
 * @param {string} currency - e.g. BTC, ETH, SOL, MATIC
 * @param {string|number} amount - e.g. 0.0134
 * @param {string=} overrideAddress - optionally provide a custom address
 * @returns {Promise<Buffer|null>}
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
    const uri = `${cleanCurrency.toLowerCase()}:${address}?amount=${formatted}&label=BalticPharmaBot&message=Order`;

    const buffer = await QRCode.toBuffer(uri, {
      type: "png",
      width: 180, // Small size for Telegram mobile
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

    return buffer;

  } catch (err) {
    console.error("❌ [generateQR error]:", err.message || err);
    return null;
  }
}

/**
 * Returns a UX-friendly message with a copy button
 */
export function generatePaymentMessageWithButton(currency, amount, address) {
  const cleanCurrency = String(currency || "").toUpperCase() || "???";
  const parsedAmount = parseFloat(amount);
  const formattedAmount = Number.isFinite(parsedAmount)
    ? parsedAmount.toFixed(6)
    : "?.??????";

  const cleanAddress = String(address || "").trim();
  const text = `
💳 *Payment details:*

• Network: *${cleanCurrency}*
• Amount: *${formattedAmount} ${cleanCurrency}*
• Address: \`${cleanAddress}\`

⏱️ *Expected payment within 30 minutes.*
✅ Use the QR code or copy the address.
  `.trim();

  return {
    message: text,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Copy address", callback_data: `copy:${cleanAddress}` }]
      ]
    }
  };
}

/**
 * Simple address validation (accepts various crypto formats)
 */
function isValidAddress(addr) {
  return typeof addr === "string" &&
    /^[a-zA-Z0-9]{8,}$/.test(addr);
}
