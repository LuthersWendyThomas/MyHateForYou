// 📦 utils/generateQR.js
// FINAL v8.0 • BULLETPROOF AMOUNT-BASED QR GENERATOR • FULLY SYNCED

import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { WALLETS, ALIASES } from "../config/config.js";

const CACHE_DIR = path.join(process.cwd(), "qr-cache");

/**
 * 🔐 Normalize + validate symbol
 */
function normalizeSymbol(symbol) {
  const raw = String(symbol || "").trim().toLowerCase();
  return ALIASES[raw] || raw.toUpperCase();
}

/**
 * 🏦 Resolve wallet address (overridable)
 */
function resolveAddress(symbol, overrideAddress) {
  return String(overrideAddress || WALLETS[symbol] || "").trim();
}

/**
 * 💵 Build fallback file path (amount-based)
 */
function getFallbackPath(symbol, amount) {
  const fileName = `${symbol}_${Number(amount).toFixed(6)}.png`;
  return path.join(CACHE_DIR, fileName);
}

/**
 * ✅ Generates live QR PNG buffer using URI
 */
export async function generateQRBuffer(symbol, amount, address) {
  const formatted = amount.toFixed(6);
  const scheme = symbol.toLowerCase();
  const label = encodeURIComponent("BalticPharmacyBot");
  const msg = encodeURIComponent("Order");
  const uri = `${scheme}:${address}?amount=${formatted}&label=${label}&message=${msg}`;

  try {
    const buffer = await Promise.race([
      QRCode.toBuffer(uri, {
        type: "png",
        width: 300,
        margin: 3,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#FFFFFF" }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("QR generation timeout")), 4000)
      )
    ]);

    if (!Buffer.isBuffer(buffer) || buffer.length < 1000) {
      throw new Error("Generated QR buffer is invalid or too small.");
    }

    return buffer;
  } catch (err) {
    console.error("❌ [generateQRBuffer error]", err.message);
    return null;
  }
}

/**
 * 🚀 Main QR generator (live or cached fallback)
 * @param {string} currency - e.g. "eth", "btc"
 * @param {number} amount - crypto amount (e.g. 0.123456)
 * @param {string|null} overrideAddress
 * @returns {Buffer|null} PNG
 */
export async function generateQR(currency, amount, overrideAddress = null) {
  const symbol = normalizeSymbol(currency);
  const address = resolveAddress(symbol, overrideAddress);
  const parsedAmount = Number(amount);
  const filePath = getFallbackPath(symbol, parsedAmount);

  if (!isValidAddress(address)) {
    console.warn(`⚠️ [generateQR] Invalid wallet for ${symbol}: "${address}"`);
    return null;
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    console.warn(`⚠️ [generateQR] Invalid amount: ${amount}`);
    return null;
  }

  try {
    // ✅ Fallback hit
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      if (Buffer.isBuffer(buffer) && buffer.length > 1000) {
        if (process.env.DEBUG_MESSAGES === "true") {
          console.log(`📦 [generateQR] Cache hit: ${path.basename(filePath)}`);
        }
        return buffer;
      }
    }

    // ❌ Fallback miss → generate fresh
    console.warn(`❌ [generateQR] Fallback miss → generating live: ${symbol} ${parsedAmount}`);
    const buffer = await generateQRBuffer(symbol, parsedAmount, address);
    if (!buffer) return null;

    // 📁 Ensure fallback dir
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

    fs.writeFileSync(filePath, buffer);
    console.log(`💾 [generateQR] Live QR cached: ${path.basename(filePath)}`);
    return buffer;

  } catch (err) {
    console.error("❌ [generateQR error]", err.message);
    return null;
  }
}

/**
 * ✅ Message with copy button (inline use)
 */
export function generatePaymentMessageWithButton(currency, amount, overrideAddress = null) {
  const symbol = normalizeSymbol(currency);
  const val = Number(amount);
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

/**
 * 🔐 Wallet format check
 */
function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}

/**
 * 🧼 Clear cache for given symbol (optional)
 */
export function cleanOldPngs(symbol) {
  try {
    const files = fs.readdirSync(CACHE_DIR);
    const pattern = new RegExp(`^${symbol}_[\\d.]+\\.png$`);
    const filtered = files.filter(f => pattern.test(f));
    for (const file of filtered) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
    }
    console.log(`🧹 [cleanOldPngs] Removed ${filtered.length} old QR(s) for ${symbol}`);
  } catch (err) {
    console.warn("⚠️ [cleanOldPngs] Failed:", err.message);
  }
}

// ✅ Exports
export {
  normalizeSymbol,
  resolveAddress
};
