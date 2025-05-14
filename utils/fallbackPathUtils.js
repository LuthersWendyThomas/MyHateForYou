// 📦 utils/fallbackPathUtils.js | IMMORTAL FINAL v2.0.0•DIAMONDLOCK•AUKSINE•SYNCED

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
  const key = String(raw || "").trim().toLowerCase();
  return (ALIASES[key] || key).toUpperCase();
}

/**
 * 💵 Clean + round crypto amount (e.g., 0.12345678 → 0.123456)
 * @param {number|string} input
 * @returns {number}
 */
export function sanitizeAmount(input) {
  const val = Number(input);
  return Number.isFinite(val) && val > 0 ? +val.toFixed(6) : 0;
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
