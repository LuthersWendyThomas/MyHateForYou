// 📦 utils/generateQR.js | BalticPharma V2 — IMMORTAL SYNCED v2025.5.1 FINAL FIX

import QRCode from "qrcode";
import { WALLETS } from "../config/config.js";

/**
 * Generuoja QR paveikslėlį kripto mokėjimui
 * @param {string} currency - pvz. BTC, ETH, SOL, MATIC
 * @param {string|number} amount - pvz. 0.0134
 * @param {string=} overrideAddress - galima nurodyti savo adresą
 * @returns {Promise<Buffer|null>}
 */
export async function generateQR(currency, amount, overrideAddress) {
  try {
    if (!currency || amount === undefined || amount === null) {
      console.warn("⚠️ [generateQR] Trūksta valiutos arba sumos.");
      return null;
    }

    const cleanCurrency = String(currency).trim().toUpperCase();
    const address = String(overrideAddress || WALLETS[cleanCurrency] || "").trim();
    const parsedAmount = parseFloat(amount);

    if (!address || address.length < 8 || !isValidAddress(address)) {
      console.warn(`[generateQR] Neteisingas arba tuščias adresas: "${address}"`);
      return null;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      console.warn(`[generateQR] Neteisinga suma: ${amount}`);
      return null;
    }

    const formatted = parsedAmount.toFixed(6);
    const uri = `${cleanCurrency.toLowerCase()}:${address}?amount=${formatted}&label=BalticPharmaBot&message=Užsakymas`;

    const buffer = await QRCode.toBuffer(uri, {
      type: "png",
      width: 180, // Mažas dydis Telegram mobiliai
      margin: 1,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });

    if (!buffer || !(buffer instanceof Buffer)) {
      throw new Error("QR sugeneruotas blogu formatu");
    }

    return buffer;

  } catch (err) {
    console.error("❌ [generateQR klaida]:", err.message || err);
    return null;
  }
}

/**
 * Grąžina UX-friendly žinutę su kopijavimo mygtuku
 */
export function generatePaymentMessageWithButton(currency, amount, address) {
  const cleanCurrency = String(currency || "").toUpperCase() || "???";
  const parsedAmount = parseFloat(amount);
  const formattedAmount = Number.isFinite(parsedAmount)
    ? parsedAmount.toFixed(6)
    : "?.??????";

  const cleanAddress = String(address || "").trim();
  const text = `
💳 *Mokėjimo informacija:*

• Tinklas: *${cleanCurrency}*
• Suma: *${formattedAmount} ${cleanCurrency}*
• Adresas: \`${cleanAddress}\`

⏱️ *Laukiamas apmokėjimas per 30 min.*
✅ Naudokite QR arba kopijuokite adresą.
  `.trim();

  return {
    message: text,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Kopijuoti adresą", callback_data: `copy:${cleanAddress}` }]
      ]
    }
  };
}

/**
 * Paprasta adreso validacija (leidžia įvairias kripto adresų formas)
 */
function isValidAddress(addr) {
  return typeof addr === "string" &&
    /^[a-zA-Z0-9]{8,}$/.test(addr);
}
