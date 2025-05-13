// 🛡️ utils/cryptoQR.js | IMMORTAL FINAL v1.2.1•DIAMONDLOCK+9999999x SYNC
// QR & Payment Message Generation • BULLETPROOF • TIMEOUT PROTECTED • ZERO DELAY

import QRCode from "qrcode";
import { WALLETS, ALIASES } from "../config/config.js";

/**
 * ✅ Generates QR PNG buffer for supported network + amount
 * @param {string} currency – e.g. "btc", "eth", "matic", "sol"
 * @param {number|string} amount – amount in that currency
 * @param {string|null} overrideAddress – override wallet address (optional)
 * @returns {Promise<Buffer|null>}
 */
export async function generateQR(currency, amount, overrideAddress = null) {
  const raw          = String(currency || "").trim().toLowerCase();
  const normalized   = ALIASES[raw] || raw.toUpperCase();
  const address      = String(overrideAddress || WALLETS[normalized] || "").trim();
  const parsedAmount = Number(amount);

  if (!isValidAddress(address)) {
    console.warn(`⚠️ [generateQR] Invalid address for ${normalized}: "${address}"`);
    return null;
  }
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    console.warn(`⚠️ [generateQR] Invalid amount: ${amount}`);
    return null;
  }

  const formatted    = parsedAmount.toFixed(6);
  const scheme       = normalized.toLowerCase();
  const label        = encodeURIComponent("BalticPharmacyBot");
  const messageParam = encodeURIComponent("Order");
  const uri          = `${scheme}:${address}?amount=${formatted}&label=${label}&message=${messageParam}`;

  try {
    const buffer = await Promise.race([
      QRCode.toBuffer(uri, {
        type: "png",
        width: 140,
        margin: 1,
        scale: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#FFFFFF" }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("QR generation timeout")), 5000)
      )
    ]);

    if (!Buffer.isBuffer(buffer) || !buffer.length) {
      throw new Error("QR generation failed: no valid buffer");
    }

    if (process.env.DEBUG_MESSAGES === "true") {
      console.log(`✅ [generateQR] ${normalized} → ${formatted} → ${buffer.length} bytes`);
    }

    return buffer;

  } catch (err) {
    console.error("❌ [generateQR error]:", err.message);
    return null;
  }
}

/**
 * ✅ Generates inline message + button with wallet address
 * @param {string} currency
 * @param {number|string} amount
 * @param {string|null} overrideAddress
 * @returns {{ message: string, reply_markup: object }}
 */
export function generatePaymentMessageWithButton(currency, amount, overrideAddress = null) {
  const raw             = String(currency || "").trim().toLowerCase();
  const normalized      = ALIASES[raw] || raw.toUpperCase();
  const parsedAmount    = Number(amount);
  const formattedAmount = Number.isFinite(parsedAmount)
    ? parsedAmount.toFixed(6)
    : "?.??????";
  const address         = String(overrideAddress || WALLETS[normalized] || "").trim();
  const validAddress    = isValidAddress(address) ? address : "[Invalid address]";

  const message = `
💳 *Payment details:*
• Network: *${normalized}*
• Amount: *${formattedAmount} ${normalized}*
• Address: \`${validAddress}\`
⏱️ *Expected payment within 30 minutes.*
✅ Use the QR code or copy the address.
`.trim();

  return {
    message,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Copy address", callback_data: `copy:${validAddress}` }]
      ]
    }
  };
}

/** ✅ Basic wallet format check (8+ alphanumeric) */
function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}
