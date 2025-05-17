// 📦 fallbackPathUtils.js | IMMORTAL FINAL v2.0.0 • PLAN C LOCK • ONLY NAMED FALLBACKS

import path from "path";
import { NETWORKS } from "./fetchCryptoPrice.js";

// Tikslus kelias į QR fallback direktoriją
export const FALLBACK_DIR = path.join(process.cwd(), "qr-cache");

/**
 * 🔐 Normalize currency symbol (e.g., eth → ETH)
 * @param {string} raw
 * @returns {string}
 */
export function normalizeSymbol(raw) {
  try {
    const key = String(raw || "").trim().toLowerCase();
    return (NETWORKS[key] || key).toUpperCase();
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
    const rounded = Math.floor(val * 1e6) / 1e6;
    return +rounded.toFixed(6);
  } catch {
    return 0;
  }
}
