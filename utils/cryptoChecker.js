// 🛡️ utils/cryptoChecker.js | IMMORTAL FINAL v1.1.0•GODMODE DIAMONDLOCK
// 24/7 PAYMENT VERIFICATION • BTC/ETH/MATIC/SOL • ASYNC LOGGING • TIMEOUTS • NO BLOCKING

import fetch from "node-fetch";
import { promises as fs } from "fs";
import path from "path";
import { API, ALIASES } from "../config/config.js";

const LOG_DIR   = path.join(process.cwd(), "logs");
const LOG_FILE  = path.join(LOG_DIR, "cryptoChecks.log");
const TIMEOUT   = 5_000;   // 5 seconds for all on-chain calls

// Supported symbols
const SUPPORTED = new Set(["BTC", "ETH", "MATIC", "SOL"]);

/**
 * Verifies on-chain payment ≥ expectedAmount.
 * Logs asynchronously. Never blocks event loop.
 *
 * @param {string} wallet
 * @param {string} currency  – e.g. "BTC","ETH","MATIC","SOL"
 * @param {number} expectedAmount
 * @returns {Promise<boolean>}
 */
export async function checkPayment(wallet, currency, expectedAmount) {
  const curInput = String(currency || "").trim().toLowerCase();
  const cur      = (ALIASES[curInput] || curInput).toUpperCase();
  const amount   = Number(expectedAmount);

  // quick param validation
  if (
    !wallet ||
    typeof wallet !== "string" ||
    wallet.length < 8 ||
    !SUPPORTED.has(cur) ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    await _log(wallet, cur, amount, "❌ INVALID PARAMS");
    return false;
  }

  try {
    let paid;
    switch (cur) {
      case "BTC":
        paid = await _checkWithTimeout(() => _checkBTC(wallet, amount));
        break;
      case "ETH":
      case "MATIC":
        paid = await _checkWithTimeout(() =>
          _checkEVM(
            wallet,
            amount,
            cur === "ETH" ? API.ETHEREUM_RPC : API.MATIC_RPC,
            cur
          )
        );
        break;
      case "SOL":
        paid = await _checkWithTimeout(() => _checkSOL(wallet, amount));
        break;
    }

    await _log(wallet, cur, amount, paid ? "✅ PAID" : "❌ NOT PAID");
    return !!paid;

  } catch (err) {
    console.error(`❌ [checkPayment fatal → ${cur}]:`, err.message);
    await _log(wallet, cur, amount, `❌ ERROR (${err.message})`);
    return false;
  }
}

// —————————————————————————————————————————————
// Internal helpers

/** Wrap any promise in a timeout */
async function _checkWithTimeout(fn) {
  return Promise.race([
    fn(),
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("Timeout")), TIMEOUT)
    )
  ]);
}

async function _checkBTC(address, expected) {
  const res = await fetch(`${API.BTC_RPC}${address}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const sats = parseInt(text, 10);
  if (!Number.isFinite(sats)) throw new Error("Invalid satoshi balance");
  return sats / 1e8 >= expected;
}

async function _checkEVM(address, expected, rpcUrl, label) {
  const payload = {
    jsonrpc: "2.0",
    id:      Date.now(),
    method:  "eth_getBalance",
    params:  [address, "latest"]
  };
  const res = await fetch(rpcUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { result } = await res.json();
  if (typeof result !== "string") throw new Error(`Invalid ${label} response`);
  const wei = parseInt(result, 16);
  if (!Number.isFinite(wei)) throw new Error("Invalid wei balance");
  return wei / 1e18 >= expected;
}

async function _checkSOL(address, expected) {
  const payload = {
    jsonrpc: "2.0",
    id:      Date.now(),
    method:  "getBalance",
    params:  [address]
  };
  const res = await fetch(API.SOLANA_RPC, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const lam = data?.result?.value;
  if (!Number.isFinite(lam)) throw new Error("Invalid lamports");
  return lam / 1e9 >= expected;
}

/** Ensure log directory exists & append entry asynchronously */
async function _log(wallet, currency, amount, status) {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    const time  = new Date().toISOString();
    const entry = `${time} | ${currency} | ${amount} | ${wallet} | ${status}\n`;
    await fs.appendFile(LOG_FILE, entry);
  } catch (err) {
    console.warn("⚠️ [cryptoChecks.log error]:", err.message);
  }
}
