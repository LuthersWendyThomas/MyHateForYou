// 📦 utils/fallbackPathUtils.js | FINAL IMMORTAL v2.0.1•DIAMONDLOCK•∞UPGRADE•SAFECORE

import path from "path";
import { ALIASES } from "../config/config.js";

/**
 * 📁 Absolute fallback cache directory
 */
export const FALLBACK_DIR = path.join(process.cwd(), "qr-cache");

/**
 * 🔐 Normalize currency symbol (e.g., eth → ETH)
 * @param {string} raw
 * @returns {string}
 */
export function normalizeSymbol(raw) {
  try {
    const key = String(raw || "").trim().toLowerCase();
    return (ALIASES[key] || key).toUpperCase();
  } catch {
    return "UNKNOWN";
  }
}

/**
 * 💵 Clean + round crypto amount (e.g., 0.12345678 → 0.123456)
 * @param {number|string} input
 * @returns {number}
 */
export function sanitizeAmount(input) {
  try {
    const val = Number(input);
    if (!Number.isFinite(val) || val <= 0) return 0;
    const rounded = Math.floor(val * 1e6) / 1e6; // avoid floating point edge cases
    return +rounded.toFixed(6);
  } catch {
    return 0;
  }
}

/**
 * 💾 Standard fallback filename: SYMBOL_0.123456.png
 * @param {string} symbol - e.g. "BTC" or "eth"
 * @param {number|string} amount - e.g. 0.123456
 * @returns {string} e.g. BTC_0.123456.png
 */
export function getAmountFilename(symbol, amount) {
  const sym = normalizeSymbol(symbol);
  const amt = sanitizeAmount(amount);
  return `${sym}_${amt.toFixed(6)}.png`;
}

/**
 * 📂 Full absolute path to fallback PNG file
 * @param {string} symbol
 * @param {number|string} amount
 * @returns {string} e.g. /.../qr-cache/BTC_0.123456.png
 */
export function getFallbackPath(symbol, amount) {
  return path.join(FALLBACK_DIR, getAmountFilename(symbol, amount));
}
