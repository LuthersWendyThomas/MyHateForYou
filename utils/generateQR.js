// 📦 utils/generateQR.js | IMMORTAL FINAL v6.0•DIAMONDLOCK•CACHEFALLBACK•GODMODE
// QR FALLBACK SYSTEM • PNG BUFFER EXPORT • LOCAL CACHE • BULLETPROOF INTEGRATION

import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { WALLETS, ALIASES } from "../config/config.js";

const CACHE_DIR = "./qr-cache"; // MUST match everywhere in qrCacheManager

/**
 * ✅ Main QR generator: uses cache if found, else generates and saves
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
    // ✅ Attempt from cache
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
    if (!buffer) {
      console.error("❌ [generateQR] QR buffer generation failed.");
      return null;
    }

    // 🧼 Ensure directory exists
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

    // 🧹 Optional cleanup per symbol (if needed):
    // cleanOldPngs(normalized); ← Optional, or handled by hourly job

    fs.writeFileSync(filePath, buffer);
    console.log(`✅ [generateQR] Fresh QR cached: ${fileName}`);

    return buffer;

  } catch (err) {
    console.error("❌ [generateQR error]", err.message);
    return null;
  }
}

/**
 * ✅ Low-level PNG buffer generator
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
 * ✅ Message & Copy button for inline use
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
 * ✅ Basic wallet format validation
 */
function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}

/**
 * 🧼 Clean old PNGs per currency symbol (optional)
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
    console.warn("⚠️ [cleanOldPngs]", err.message);
  }
}

// ✅ FINAL EXPORTS — used by qrCacheManager and paymentHandler
export {
  generateQR,
  generateQRBuffer,
  generatePaymentMessageWithButton
};
