import path from "path";
import { ALIASES } from "../config/config.js";
import { getAllQrScenarios } from "./qrScenarios.js"; // Pridėtas importas iš qrScenarios.js

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
    const rounded = Math.floor(val * 1e6) / 1e6;
    return +rounded.toFixed(6);
  } catch {
    return 0;
  }
}

/**
 * 💾 Standard fallback filename: SYMBOL_0.123456.png
 * @param {string} symbol - e.g. "BTC" or "eth"
 * @param {number|string} amount - e.g. 0.123456
 * @returns {string}
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
 * @returns {string}
 */
export function getFallbackPath(symbol, amount) {
  return path.join(FALLBACK_DIR, getAmountFilename(symbol, amount));
}

/**
 * 🔎 Match filename like BTC_0.123456.png against scenario
 * @param {string} fileName
 * @param {object} scenario
 * @returns {boolean}
 */
export function matchFallbackFilenameToScenario(fileName, scenario) {
  try {
    const [symbol, amtRaw] = fileName.replace(".png", "").split("_");
    const fileSymbol = normalizeSymbol(symbol);
    const fileAmount = sanitizeAmount(amtRaw);

    const scenarioSymbol = normalizeSymbol(scenario.rawSymbol);
    const expectedAmount = sanitizeAmount(scenario.totalUSD / scenario.mockRate || 1); // default fallback

    return fileSymbol === scenarioSymbol && fileAmount === expectedAmount;
  } catch {
    return false;
  }
}

/**
 * 📜 List of all expected fallback filenames based on all scenarios
 * (requires rate fetching in real execution)
 * @param {(sym: string) => number} getMockRate - function that returns USD→Crypto rate for a symbol
 * @returns {string[]} e.g. ["BTC_0.123456.png", "ETH_0.004321.png", ...]
 */
export async function getAllFallbackFilenames(getMockRate) {
  const scenarios = await getAllQrScenarios(); // FIXED: added await
  return scenarios.map(({ rawSymbol, totalUSD }) => {
    const rate = getMockRate(rawSymbol);
    const amount = sanitizeAmount(totalUSD / rate);
    return getAmountFilename(rawSymbol, amount);
  });
}
