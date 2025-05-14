// 📦 utils/generateQR.js | IMMORTAL FINAL v5.1•DIAMONDLOCK+CACHE+CLEANER
// QR FALLBACK CACHE + BUFFER EXPORT + PNG TRIMMER • ZERO DELAY SYSTEM

import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { WALLETS, ALIASES } from "../config/config.js";

const CACHE_DIR = "./qr_cache";

/**
 * ✅ Generates or retrieves cached QR PNG for network+amount
 */
export async function generateQR(currency, amount, overrideAddress = null) {
  const raw          = String(currency || "").trim().toLowerCase();
  const normalized   = ALIASES[raw] || raw.toUpperCase();
  const address      = String(overrideAddress || WALLETS[normalized] || "").trim();
  const parsedAmount = Number(amount);
  const filename     = `${normalized}_${parsedAmount.toFixed(6)}.png`;
  const filepath     = path.join(CACHE_DIR, filename);

  if (!isValidAddress(address)) {
    console.warn(`⚠️ [generateQR] Invalid address for ${normalized}: "${address}"`);
    return null;
  }
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    console.warn(`⚠️ [generateQR] Invalid amount: ${amount}`);
    return null;
  }

  try {
    if (fs.existsSync(filepath)) {
      const buffer = fs.readFileSync(filepath);
      if (buffer?.length > 0) {
        if (process.env.DEBUG_MESSAGES === "true") {
          console.log(`⚡ [generateQR] Cache hit: ${filename}`);
        }
        return buffer;
      }
    }

    const buffer = await generateQRBuffer(normalized, parsedAmount, address);
    if (!buffer) return null;

    try {
      if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);
      cleanOldPngs(normalized); // 🧼 Clean old PNGs before saving new
      fs.writeFileSync(filepath, buffer);
      console.log(`✅ [generateQR] Cached new QR: ${filename}`);
    } catch (e) {
      console.warn("⚠️ [generateQR] Failed to save PNG", e.message);
    }

    return buffer;

  } catch (err) {
    console.error("❌ [generateQR error]:", err.message);
    return null;
  }
}

/**
 * ✅ Generates QR buffer directly from URI
 */
export async function generateQRBuffer(symbol, amount, address) {
  const formatted = amount.toFixed(6);
  const scheme    = symbol.toLowerCase();
  const label     = encodeURIComponent("BalticPharmacyBot");
  const msg       = encodeURIComponent("Order");
  const uri       = `${scheme}:${address}?amount=${formatted}&label=${label}&message=${msg}`;

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

    return buffer;
  } catch (err) {
    console.error("❌ [generateQRBuffer]", err.message);
    return null;
  }
}

/**
 * ✅ Generates inline payment message + copy button
 */
export function generatePaymentMessageWithButton(currency, amount, overrideAddress = null) {
  const raw       = String(currency || "").trim().toLowerCase();
  const normalized = ALIASES[raw] || raw.toUpperCase();
  const val       = Number(amount);
  const display   = Number.isFinite(val) ? val.toFixed(6) : "?.??????";
  const addr      = String(overrideAddress || WALLETS[normalized] || "").trim();
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
      inline_keyboard: [
        [{ text: "📋 Copy address", callback_data: `copy:${validAddr}` }]
      ]
    }
  };
}

/**
 * 🧼 Remove all PNGs for same currency
 */
function cleanOldPngs(symbol) {
  try {
    const files = fs.readdirSync(CACHE_DIR);
    const pattern = new RegExp(`^${symbol}_.*\\.png$`);
    const filtered = files.filter(f => pattern.test(f));
    for (const file of filtered) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
    }
    console.log(`🧹 [cleanOldPngs] Cleared ${filtered.length} file(s) for ${symbol}`);
  } catch (err) {
    console.warn("⚠️ [cleanOldPngs] Failed:", err.message);
  }
}

/**
 * ✅ Basic wallet format check (8+ alphanumeric)
 */
function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}
