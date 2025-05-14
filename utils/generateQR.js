// 📦 utils/generateQR.js | FINAL IMMORTAL v10.1•DIAMONDLOCK•SYNCED•FALLBACKFIXED

import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { WALLETS, ALIASES } from "../config/config.js";

const CACHE_DIR = path.join(process.cwd(), "qr-cache");

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
  return String(overrideAddress || WALLETS[symbol] || "").trim();
}

/**
 * 💾 Standard fallback filename: SYMBOL_0.123456.png
 */
export function getAmountFilename(symbol, amount) {
  return `${symbol.toUpperCase()}_${Number(amount).toFixed(6)}.png`;
}

/**
 * 📁 Full fallback path from symbol + amount
 */
export function getFallbackPath(symbol, amount) {
  return path.join(CACHE_DIR, getAmountFilename(symbol, amount));
}

/**
 * 🧪 PNG buffer validity
 */
function isValidBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length > 1000;
}

/**
 * 🔐 Wallet validator
 */
function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}

/**
 * ⚡ Fast QR buffer generation with timeout
 */
export async function generateQRBuffer(symbol, amount, address) {
  const formatted = amount.toFixed(6);
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

    if (!isValidBuffer(buffer)) throw new Error("QR buffer invalid or too small");
    return buffer;

  } catch (err) {
    console.error("❌ [generateQRBuffer]", err.message);
    return null;
  }
}

/**
 * 🚀 Main QR generator — fallback-first + live + cache
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
    // ✅ Check fallback PNG first
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      if (isValidBuffer(buffer)) {
        if (process.env.DEBUG_MESSAGES === "true") {
          console.log(`📦 [generateQR] Cache hit: ${path.basename(filePath)}`);
        }
        return buffer;
      } else {
        console.warn(`⚠️ [generateQR] Corrupt fallback: ${path.basename(filePath)}`);
      }
    }

    // ❌ No fallback → generate live
    console.warn(`❌ [generateQR] Cache miss → generating live: ${symbol} ${parsedAmount}`);
    const buffer = await generateQRBuffer(symbol, parsedAmount, address);
    if (!buffer) return null;

    // 💾 Save for future fallback use
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
 * 📬 Payment message with copyable address
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
 * 🧼 Cleanup PNGs for specific symbol
 */
export function cleanOldPngs(symbol) {
  try {
    const files = fs.readdirSync(CACHE_DIR);
    const regex = new RegExp(`^${symbol.toUpperCase()}_[\\d.]+\\.png$`);
    const targets = files.filter(f => regex.test(f));

    for (const file of targets) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
    }

    console.log(`🧹 [cleanOldPngs] Removed ${targets.length} QR(s) for ${symbol}`);
  } catch (err) {
    console.warn("⚠️ [cleanOldPngs] Failed:", err.message);
  }
}
