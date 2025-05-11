import QRCode from "qrcode";
import { WALLETS, ALIASES } from "../config/config.js";

/**
 * ✅ Generates QR PNG buffer for supported network + amount
 * @param {string} currency - e.g. "btc", "eth", "matic", "sol"
 * @param {number|string} amount - amount in that currency
 * @param {string|null} overrideAddress - override wallet address (optional)
 * @returns {Buffer|null}
 */
export async function generateQR(currency, amount, overrideAddress = null) {
  try {
    const raw = String(currency || "").toLowerCase();
    const normalized = ALIASES[raw] || raw.toUpperCase();
    const parsedAmount = parseFloat(amount);
    const address = String(overrideAddress || WALLETS[normalized] || "").trim();

    if (!isValidAddress(address)) {
      console.warn(`⚠️ [generateQR] Invalid address for ${normalized}: "${address}"`);
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
      width: 140, // ⬅️ Smaller by ~30% (default ~200)
      margin: 1,
      scale: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });

    if (!(buffer instanceof Buffer)) {
      throw new Error("QR generation failed (non-buffer).");
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
 * ✅ Generates inline message + button with wallet address
 */
export function generatePaymentMessageWithButton(currency, amount, overrideAddress = null) {
  const raw = String(currency || "").toLowerCase();
  const normalized = ALIASES[raw] || raw.toUpperCase();
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
 * ✅ Basic wallet format check (8+ alphanumeric)
 */
function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}
