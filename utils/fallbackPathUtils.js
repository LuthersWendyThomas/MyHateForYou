// 📦 utils/fallbackPathUtils.js | IMMORTAL FINAL v1.0.0•DIAMONDLOCK•SYNC•UNIVERSAL

import path from "path";

/**
 * 📁 Fallback cache dir
 */
export const FALLBACK_DIR = path.join(process.cwd(), "qr-cache");

/**
 * 💾 Standard fallback filename: SYMBOL_0.123456.png
 * @param {string} symbol - e.g. BTC
 * @param {number} amount - e.g. 0.123456
 * @returns {string} e.g. BTC_0.123456.png
 */
export function getAmountFilename(symbol, amount) {
  return `${symbol.toUpperCase()}_${Number(amount).toFixed(6)}.png`;
}

/**
 * 🗂️ Full path to fallback PNG
 * @param {string} symbol
 * @param {number} amount
 * @returns {string} /.../qr-cache/BTC_0.123456.png
 */
export function getFallbackPath(symbol, amount) {
  return path.join(FALLBACK_DIR, getAmountFilename(symbol, amount));
}
