// 📦 utils/generateQR.js | IMMORTAL FINAL v7.0•DIAMONDLOCK•FALLBACKSYNC•CACHEHIT100%
// QR FALLBACK SYSTEM • PNG BUFFER EXPORT • FULL SYNC W/ qrCacheManager.js

import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { WALLETS, ALIASES } from "../config/config.js";

// ✅ Unified fallback cache dir
const CACHE_DIR = path.join(process.cwd(), "qr-cache");

/**
 * ✅ Finalized QR generator — generates & caches sanitized PNG QR codes
 * @param {string} currency - e.g. "eth", "btc", etc.
 * @param {number} amount - crypto amount (USD converted)
 * @param {string|null} overrideAddress - custom address (optional)
 * @returns {Buffer|null} PNG QR buffer
 */
async function generateQR(currency, amount, overrideAddress = null) {
  const raw = String(currency || "").trim().toLowerCase();
  const normalized = ALIASES[raw] || raw.toUpperCase();
  const address = String(overrideAddress || WALLETS[normalized] || "").trim();
  const parsedAmount = Number(amount);

  const fileName = `${normalized}_${parsedAmount.toFixed(6)}.png`;
  const filePath = path.join(CACHE_DIR, fileName);

  if (!isValidAddress(address)) {
    console.warn(`⚠️ [generateQR] Invalid address for ${normalized}: "${address}"`);
    return null;
  }
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    console.warn(`⚠️ [generateQR] Invalid amount: ${amount}`);
    return null;
  }

  try {
    // ✅ Use cached PNG if valid
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      if (Buffer.isBuffer(buffer) && buffer.length > 1000) {
        if (process.env.DEBUG_MESSAGES === "true") {
          console.log(`⚡ [generateQR] Cache hit: ${fileName}`);
        }
        return buffer;
      } else {
        console.warn(`⚠️ [generateQR] Cached PNG too small or invalid: ${fileName}`);
      }
    }

    // ❌ Cache miss or invalid — generate fresh
    const buffer = await generateQRBuffer(normalized, parsedAmount, address);
    if (!buffer) throw new Error("QR buffer generation failed");

    // 🧱 Ensure folder exists
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

    fs.writeFileSync(filePath, buffer);
    console.log(`✅ [generateQR] Fresh QR cached: ${fileName}`);
    return buffer;

  } catch (err) {
    console.error("❌ [generateQR error]:", err.message);
    return null;
  }
}

/**
 * ✅ Generates QR PNG buffer using URI
 */
async function generateQRBuffer(symbol, amount, address) {
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
      throw new Error("Generated buffer invalid or too small.");
    }

    return buffer;

  } catch (err) {
    console.error("❌ [generateQRBuffer]", err.message);
    return null;
  }
}

/**
 * ✅ Payment message with QR copy button
 */
function generatePaymentMessageWithButton(currency, amount, overrideAddress = null) {
  const raw = String(currency || "").trim().toLowerCase();
  const normalized = ALIASES[raw] || raw.toUpperCase();
  const val = Number(amount);
  const display = Number.isFinite(val) ? val.toFixed(6) : "?.??????";
  const addr = String(overrideAddress || WALLETS[normalized] || "").trim();
  const validAddr = isValidAddress(addr) ? addr : "[Invalid address]";

  const message = `
💳 *Payment details:*
• Network: *${normalized}*
• Amount: *${display} ${normalized}*
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
 * ✅ Wallet format validator
 */
function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}

/**
 * 🧼 Cleanup cache (optional tool)
 */
function cleanOldPngs(symbol) {
  try {
    const files = fs.readdirSync(CACHE_DIR);
    const pattern = new RegExp(`^${symbol}_.*\\.png$`);
    const filtered = files.filter(f => pattern.test(f));
    for (const file of filtered) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
    }
    console.log(`🧹 [cleanOldPngs] Removed ${filtered.length} old QR(s) for ${symbol}`);
  } catch (err) {
    console.warn("⚠️ [cleanOldPngs] Failed:", err.message);
  }
}

// ✅ Final exports
export {
  generateQR,
  generateQRBuffer,
  generatePaymentMessageWithButton
};
