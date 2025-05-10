// 📦 utils/generateQR.js | IMMORTAL v3.2 — ULTRA BULLETPROOF INLINE+QR ALIAS GODMODE

import QRCode from "qrcode";
import { WALLETS, ALIASES } from "../config/config.js";

/**
 * ✅ Generates QR code PNG buffer for crypto payment
 */
export async function generateQR(currency, amount, overrideAddress) {
  try {
    if (!currency || amount === undefined || amount === null) {
      console.warn("⚠️ [generateQR] Missing currency or amount.");
      return null;
    }

    const normalized = ALIASES[String(currency).toLowerCase()] || String(currency).toUpperCase();
    const parsedAmount = parseFloat(amount);
    const address = String(overrideAddress || WALLETS[normalized] || "").trim();

    if (!isValidAddress(address)) {
      console.warn(`⚠️ [generateQR] Invalid address: "${address}"`);
      return null;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      console.warn(`⚠️ [generateQR] Invalid amount: ${amount}`);
      return null;
    }

    const formatted = parsedAmount.toFixed(6);
    const uri = `${normalized.toLowerCase()}:${address}?amount=${formatted}&label=BalticPharmacyBot&message=Order`;

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

    if (!(buffer instanceof Buffer)) {
      throw new Error("QR code not generated as buffer.");
    }

    if (process.env.DEBUG_MESSAGES === "true") {
      console.log(`✅ [generateQR] ${normalized} → ${formatted} → OK`);
    }

    return buffer;
  } catch (err) {
    console.error("❌ [generateQR error]:", err.message || err);
    return null;
  }
}

/**
 * ✅ Generates message with copyable crypto address inline button
 */
export function generatePaymentMessageWithButton(currency, amount, overrideAddress = null) {
  const normalized = ALIASES[String(currency || "").toLowerCase()] || String(currency).toUpperCase();
  const parsedAmount = parseFloat(amount);
  const formattedAmount = Number.isFinite(parsedAmount)
    ? parsedAmount.toFixed(6)
    : "?.??????";

  const address = String(overrideAddress || WALLETS[normalized] || "").trim();
  const valid = isValidAddress(address) ? address : "[Invalid address]";

  const message = `
💳 *Payment details:*

• Network: *${normalized}*
• Amount: *${formattedAmount} ${normalized}*
• Address: \`${valid}\`

⏱️ *Expected payment within 30 minutes.*
✅ Use the QR code or copy the address.
`.trim();

  return {
    message,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Copy address", callback_data: `copy:${valid}` }]
      ]
    }
  };
}

/**
 * ✅ Basic validation of wallet address format
 */
function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}
