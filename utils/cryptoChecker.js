// 🛡️ utils/cryptoChecker.js | IMMORTAL FINAL v1.0.1•GODMODE DIAMONDLOCK
// 24/7 PAYMENT VERIFICATION • BTC/ETH/MATIC/SOL • LOG ONLY

import fetch from "node-fetch";
import fs    from "fs";
import path  from "path";
import { API, ALIASES } from "../config/config.js";

const logDir  = path.join(process.cwd(), "logs");
const logPath = path.join(logDir, "cryptoChecks.log");

// Supported symbols
const SUPPORTED = {
  BTC: true,
  ETH: true,
  MATIC: true,
  SOL: true
};

/**
 * Verifies on-chain payment ≥ expectedAmount.
 * Logs every check.
 *
 * @param {string} wallet
 * @param {string} currency  – e.g. "BTC","ETH","MATIC","SOL"
 * @param {number} expectedAmount
 * @returns {Promise<boolean>}
 */
export async function checkPayment(wallet, currency, expectedAmount) {
  const curInput = String(currency || "").trim().toLowerCase();
  const cur      = ALIASES[curInput] || curInput.toUpperCase();
  const amount   = parseFloat(expectedAmount);

  // validate params
  if (
    !wallet ||
    typeof wallet !== "string" ||
    wallet.length < 8 ||
    !SUPPORTED[cur] ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    _log(wallet, cur, amount, "❌ INVALID PARAMS");
    return false;
  }

  try {
    let paid = false;
    switch (cur) {
      case "BTC":
        paid = await _checkBTC(wallet, amount);
        break;
      case "ETH":
      case "MATIC":
        paid = await _checkEVM(
          wallet,
          amount,
          cur === "ETH" ? API.ETHEREUM_RPC : API.MATIC_RPC,
          cur
        );
        break;
      case "SOL":
        paid = await _checkSOL(wallet, amount);
        break;
    }

    _log(wallet, cur, amount, paid ? "✅ PAID" : "❌ NOT PAID");
    return paid;

  } catch (err) {
    console.error(`❌ [checkPayment fatal → ${cur}]:`, err.message);
    _log(wallet, cur, amount, "❌ ERROR");
    return false;
  }
}

// —————————————————————————————————————————————

async function _checkBTC(address, expected) {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API.BTC_RPC}${address}`, { signal: controller.signal });
    clearTimeout(timeout);

    const sats = parseInt(await res.text(), 10);
    if (!Number.isFinite(sats)) throw new Error("Invalid satoshi balance");

    return sats / 1e8 >= expected;
  } catch (err) {
    console.error("❌ [BTC error]:", err.message);
    return false;
  }
}

async function _checkEVM(address, expected, rpcUrl, label) {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(rpcUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  controller.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id:      1,
        method:  "eth_getBalance",
        params:  [address, "latest"]
      })
    });
    clearTimeout(timeout);

    const json = await res.json();
    const hex  = json?.result;
    if (typeof hex !== "string") throw new Error(`Invalid ${label} hex`);

    const wei = parseInt(hex, 16);
    const val = wei / 1e18;
    return val >= expected;
  } catch (err) {
    console.error(`❌ [${label} error]:`, err.message);
    return false;
  }
}

async function _checkSOL(address, expected) {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(API.SOLANA_RPC, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  controller.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id:      1,
        method:  "getBalance",
        params:  [address]
      })
    });
    clearTimeout(timeout);

    const json     = await res.json();
    const lamports = json?.result?.value;
    if (!Number.isFinite(lamports)) throw new Error("Invalid lamports");

    return lamports / 1e9 >= expected;
  } catch (err) {
    console.error("❌ [SOL error]:", err.message);
    return false;
  }
}

// —————————————————————————————————————————————

function _log(wallet, currency, amount, status) {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const time = new Date().toISOString();
    const entry = `${time} | ${currency} | ${amount} | ${wallet} | ${status}\n`;
    fs.appendFileSync(logPath, entry, "utf8");
  } catch (err) {
    console.warn("⚠️ [cryptoChecks.log error]:", err.message);
  }
}
