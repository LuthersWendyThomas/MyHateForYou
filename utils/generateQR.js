import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { WALLETS, ALIASES } from "../config/config.js";
import {
  FALLBACK_DIR,
  getFallbackPath,
  sanitizeAmount
} from "./fallbackPathUtils.js";

/**
 * 🔐 Normalize symbol (e.g., eth → ETH)
 */
export function normalizeSymbol(symbol) {
  const raw = String(symbol || "").trim().toLowerCase();
  return ALIASES[raw] || raw.toUpperCase();
}

/**
 * 🏦 Resolve wallet address (override > config)
 */
export function resolveAddress(symbol, overrideAddress) {
  const normalized = normalizeSymbol(symbol);
  return String(overrideAddress || WALLETS[normalized] || "").trim();
}

/**
 * 🔐 Wallet validator
 */
function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}

/**
 * 🧪 PNG buffer validity
 */
function isValidBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length > 1000;
}

/**
 * ⚡ Generate QR buffer (timeout-safe)
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
 * 🧠 Master QR generator — cache-safe + fallback auto-heal
 */
export async function generateQR(currency, amount, overrideAddress = null) {
  const symbol = normalizeSymbol(currency);
  const sanitizedAmount = sanitizeAmount(amount);
  const address = resolveAddress(symbol, overrideAddress);
  const filePath = getFallbackPath(symbol, sanitizedAmount);

  if (!isValidAddress(address)) {
    console.warn(`⚠️ [generateQR] Invalid wallet for ${symbol}: "${address}"`);
    return null;
  }

  if (!Number.isFinite(sanitizedAmount) || sanitizedAmount <= 0) {
    console.warn(`⚠️ [generateQR] Invalid amount: ${amount}`);
    return null;
  }

  try {
    // 1️⃣ Try cache first (fallback)
    if (fs.existsSync(filePath)) {
      try {
        const buffer = fs.readFileSync(filePath);
        if (isValidBuffer(buffer)) {
          if (process.env.DEBUG_MESSAGES === "true") {
            console.log(`📦 [generateQR] Cache hit: ${path.basename(filePath)}`);
          }
          return buffer;
        } else {
          console.warn(`⚠️ [generateQR] Corrupt fallback: ${path.basename(filePath)} — regenerating...`);
        }
      } catch (err) {
        console.warn(`⚠️ [generateQR] Read error on fallback: ${path.basename(filePath)} — ${err.message}`);
      }
    }

    // 2️⃣ Generate new QR (live)
    console.warn(`🧪 [generateQR] Cache miss → generating live: ${symbol} ${sanitizedAmount}`);
    const buffer = await generateQRBuffer(symbol, sanitizedAmount, address);
    if (!buffer) return null;

    try {
      if (!fs.existsSync(FALLBACK_DIR)) fs.mkdirSync(FALLBACK_DIR, { recursive: true });
      fs.writeFileSync(filePath, buffer);
      console.log(`💾 [generateQR] Fallback saved: ${path.basename(filePath)}`);
    } catch (saveErr) {
      console.warn(`⚠️ [generateQR] Failed to save fallback: ${saveErr.message}`);
    }

    return buffer;

  } catch (err) {
    console.error("❌ [generateQR fatal]", err.message);
    return null;
  }
}

/**
 * 📬 Payment message with copyable address
 */
export function generatePaymentMessageWithButton(currency, amount, overrideAddress = null) {
  const symbol = normalizeSymbol(currency);
  const val = sanitizeAmount(amount);
  const display = Number.isFinite(val) ? val.toFixed(6) : "?.??????";
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
