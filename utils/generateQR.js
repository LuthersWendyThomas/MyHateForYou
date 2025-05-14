// 📦 utils/generateQR.js
// IMMORTAL FINAL v8.1 • DIAMONDLOCK • FULLY SYNCED • SELF-HEAL • BULLETPROOF

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
 * 💵 Fallback path (amount-based)
 */
function getFallbackPath(symbol, amount) {
  return path.join(CACHE_DIR, `${symbol}_${Number(amount).toFixed(6)}.png`);
}

/**
 * ✅ Generates QR PNG buffer using URI
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
    console.error("❌ [generateQRBuffer]", err.message);
    return null;
  }
}

/**
 * 🚀 Main QR generator (live or fallback)
 */
export async function generateQR(currency, amount, overrideAddress = null) {
  const symbol = normalizeSymbol(currency);
  const parsedAmount = Number(amount);
  const address = resolveAddress(symbol, overrideAddress);
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
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      if (Buffer.isBuffer(buffer) && buffer.length > 1000) {
        if (process.env.DEBUG_MESSAGES === "true") {
          console.log(`📦 [generateQR] Cache hit: ${path.basename(filePath)}`);
        }
        return buffer;
      } else {
        console.warn(`⚠️ [generateQR] Existing file invalid: ${path.basename(filePath)}`);
      }
    }

    // ❌ Cache miss or invalid → generate fresh
    console.warn(`❌ [generateQR] Miss → generating live: ${symbol} ${parsedAmount}`);
    const buffer = await generateQRBuffer(symbol, parsedAmount, address);
    if (!buffer) return null;

    // 📁 Ensure directory exists
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

    fs.writeFileSync(filePath, buffer);
    console.log(`💾 [generateQR] Live fallback saved: ${path.basename(filePath)}`);
    return buffer;

  } catch (err) {
    console.error("❌ [generateQR error]", err.message);
    return null;
  }
}

/**
 * 💬 Payment message with copy button
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
 * 🔒 Wallet validator
 */
function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}

/**
 * 🧼 Cleanup cached PNGs by symbol (optional)
 */
export function cleanOldPngs(symbol) {
  try {
    const files = fs.readdirSync(CACHE_DIR);
    const regex = new RegExp(`^${symbol}_[\\d.]+\\.png$`);
    const targets = files.filter(f => regex.test(f));

    for (const file of targets) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
    }

    console.log(`🧹 [cleanOldPngs] Removed ${targets.length} QR(s) for ${symbol}`);
  } catch (err) {
    console.warn("⚠️ [cleanOldPngs] Failed:", err.message);
  }
}

// ✅ Utility exports for system-wide QR fallback sync
export {
  normalizeSymbol,
  resolveAddress,
  getFallbackPath
};
