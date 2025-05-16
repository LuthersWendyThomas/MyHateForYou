// 📦 utils/generateQR.js | FINAL GODMODE v2.9.9•SYNCLOCK•∞READY•FALLBACKSAFE

import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { WALLETS, ALIASES } from "../config/config.js";
import {
  FALLBACK_DIR,
  getFallbackPath,
  sanitizeAmount,
  normalizeSymbol
} from "./fallbackPathUtils.js";

/**
 * 🔗 Get wallet address for given symbol
 */
export function resolveAddress(symbol, overrideAddress) {
  const normalized = normalizeSymbol(symbol);
  return String(overrideAddress || WALLETS[normalized] || "").trim();
}

/**
 * 🛡️ Simple wallet address format check
 */
function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}

/**
 * 🧪 Check if buffer is valid QR PNG
 */
function isValidBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 300;
}

/**
 * 🎨 Create QR buffer for given payment URI
 */
export async function generateQRBuffer(symbol, amount, address) {
  const formatted = sanitizeAmount(amount).toFixed(6);
  const uri = `${symbol.toLowerCase()}:${address}?amount=${formatted}&label=${encodeURIComponent("BalticPharmacyBot")}&message=${encodeURIComponent("Order")}`;

  try {
    const buffer = await Promise.race([
      QRCode.toBuffer(uri, {
        type: "png",
        width: 300,
        margin: 3,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#FFFFFF" }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("QR timeout")), 4000))
    ]);

    if (!isValidBuffer(buffer)) throw new Error("QR buffer invalid");
    return buffer;
  } catch (err) {
    console.error("❌ [generateQRBuffer]", err.message);
    return null;
  }
}

/**
 * 🧾 Generate QR buffer and save fallback PNG if needed
 */
export async function generateQR(symbolRaw, amountRaw, overrideAddress = null) {
  const symbol = normalizeSymbol(symbolRaw);
  const amount = sanitizeAmount(amountRaw);
  const address = resolveAddress(symbol, overrideAddress);
  const filePath = getFallbackPath(symbol, amount);

  if (!isValidAddress(address)) {
    console.warn(`⚠️ [generateQR] Invalid wallet for ${symbol}: "${address}"`);
    return null;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    console.warn(`⚠️ [generateQR] Invalid amount: ${amountRaw}`);
    return null;
  }

  try {
    if (process.env.DEBUG_MESSAGES === "true") {
      console.log(`🔁 [generateQR] Generating: ${symbol} → $${amount}`);
    }

    const buffer = await generateQRBuffer(symbol, amount, address);
    if (!isValidBuffer(buffer)) return null;

    try {
      if (!fs.existsSync(FALLBACK_DIR)) {
        fs.mkdirSync(FALLBACK_DIR, { recursive: true });
      }

      fs.writeFileSync(filePath, buffer);
      if (process.env.DEBUG_MESSAGES === "true") {
        console.log(`💾 [generateQR] Fallback saved: ${path.basename(filePath)}`);
      }
    } catch (saveErr) {
      console.warn(`⚠️ [generateQR] Save failed: ${saveErr.message}`);
    }

    return buffer;
  } catch (err) {
    console.error("❌ [generateQR fatal]", err.message);
    return null;
  }
}

/**
 * 💬 Generate full payment message with "copy" button
 */
export function generatePaymentMessageWithButton(currency, amount, overrideAddress = null) {
  const symbol = normalizeSymbol(currency);
  const val = sanitizeAmount(amount);
  const display = Number.isFinite(val) && val > 0 ? val.toFixed(6) : "?.??????";
  const addr = resolveAddress(symbol, overrideAddress);
  const validAddr = isValidAddress(addr) ? addr : "[Invalid address]";

  const message = `
💳 *Payment details:*
• Network: *${symbol}*
• Amount: *${display} ${symbol}*
• Address: \`${validAddr}\`
⏱️ *Expected payment within 30 minutes.*
✅ Use the QR code or copy the address.
`.trim();

  return {
    message,
    reply_markup: {
      inline_keyboard: [[{ text: "📋 Copy address", callback_data: `copy:${validAddr}` }]]
    }
  };
}
