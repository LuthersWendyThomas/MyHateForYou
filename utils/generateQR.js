// 📦 generateQR.js | IMMORTAL FINAL v3.0.0 • PLAN-C LOCK • NAMED-ONLY • ZERO-FILE-ERRORS

import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { WALLETS, ALIASES } from "../config/config.js";
import { normalizeSymbol, sanitizeAmount } from "./fallbackPathUtils.js";
import { getAllQrScenarios, getScenarioPath } from "./qrScenarios.js";

/**
 * 🔗 Resolve wallet address for a given symbol
 */
export function resolveAddress(symbol, overrideAddress) {
  const normalized = normalizeSymbol(symbol);
  const resolved = String(overrideAddress || WALLETS[normalized] || "").trim();
  if (!resolved) {
    console.warn(`❗ [resolveAddress] MISSING wallet for: ${normalized}`);
  }
  return resolved;
}

/**
 * 🛡️ Validate wallet address
 */
function isValidAddress(addr) {
  return typeof addr === "string" && /^[a-zA-Z0-9]{8,}$/.test(addr);
}

/**
 * 🧪 Validate buffer (basic check)
 */
export function isValidBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 256;
}

/**
 * 🛡️ Skirtumo Taisymas
 */
export function amountsRoughlyEqual(a, b, tolerance = 0.000001) {
  return Math.abs(sanitizeAmount(a) - sanitizeAmount(b)) < tolerance;
}

/**
 * 🎨 Generate QR buffer from URI
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
 * 🧾 Generate QR and return buffer (used both for fallback and live)
 */
export async function generateQR(symbolRaw, amountRaw, overrideAddress = null) {
  const symbol = normalizeSymbol(symbolRaw);
  const amount = sanitizeAmount(amountRaw);
  const address = resolveAddress(symbol, overrideAddress);

  if (!isValidAddress(address)) {
    console.warn(`⚠️ [generateQR] Invalid wallet for ${symbol}: "${address}"`);
    return null;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    console.warn(`⚠️ [generateQR] Invalid amount: ${amountRaw}`);
    return null;
  }

  try {
    const buffer = await generateQRBuffer(symbol, amount, address);
    return isValidBuffer(buffer) ? buffer : null;
  } catch (err) {
    console.error("❌ [generateQR fatal]", err.message);
    return null;
  }
}

/**
 * ⚡ PLAN-C NAMED FALLBACK RESOLUTION
 */
export async function getOrCreateQR(symbol, amount, overrideAddress = null, productName = null, quantity = null, category = null) {
  const all = await getAllQrScenarios();
    const match = all.find(s =>
      normalizeSymbol(s.rawSymbol) === normalizeSymbol(symbol) &&
      amountsRoughlyEqual(s.expectedAmount, amount) &&
      s.productName === productName &&
      String(s.quantity) === String(quantity) &&
      s.category === category
    );

    if (!match) {
      const expectedFilename = `${normalizeSymbol(symbol)}_${sanitizeAmount(amount).toFixed(6)}__${category}__${productName}__${quantity}.png`;
      console.warn(`❌ [getOrCreateQR] No scenario match for: ${expectedFilename}`);
      return null;
    }

    const filePath = getScenarioPath(match); // ✅ Tikslus failo kelias iš scenarijaus

  try {
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      if (isValidBuffer(buffer)) {
        if (process.env.DEBUG_MESSAGES === "true") {
          console.log(`⚡ [getOrCreateQR] Using fallback: ${path.basename(filePath)}`);
        }
        return buffer;
      } else {
        fs.unlinkSync(filePath);
        console.warn(`⚠️ Corrupted fallback deleted: ${path.basename(filePath)}`);
      }
    }

    // Fallback not found → generate live QR and save as fallback
    const buffer = await generateQR(symbol, amount, overrideAddress);
    if (isValidBuffer(buffer)) {
      try {
        fs.writeFileSync(filePath, buffer);
        if (process.env.DEBUG_MESSAGES === "true") {
          console.log(`💾 [getOrCreateQR] New fallback saved: ${path.basename(filePath)}`);
        }
      } catch (err) {
        console.warn(`⚠️ [getOrCreateQR] Save failed: ${err.message}`);
      }
      return buffer;
    }

    return null;
  } catch (err) {
    console.error(`❌ [getOrCreateQR] Error: ${err.message}`);
    return null;
  }
}

/**
 * 💬 Generate payment message with "Copy" button
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
