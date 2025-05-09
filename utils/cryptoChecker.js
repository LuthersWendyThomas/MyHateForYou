// 📦 utils/cryptoChecker.js | IMMORTAL v3.1 — BULLETPROOF FINAL FINAL NEVER FAILS EDITION+

import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { API, BOT } from "../config/config.js";

const logPath = path.join(process.cwd(), "logs", "cryptoChecks.log");

/**
 * ✅ Checks if payment was received (supports BTC, ETH, MATIC, SOL)
 */
export async function checkPayment(wallet, currency, expectedAmount, bot = null) {
  try {
    const amount = parseFloat(expectedAmount);
    const cur = currency?.toUpperCase();

    if (
      !wallet || typeof wallet !== "string" || wallet.length < 8 ||
      !cur || !["BTC", "ETH", "MATIC", "SOL"].includes(cur) ||
      !Number.isFinite(amount) || amount <= 0
    ) {
      log(wallet, currency, expectedAmount, "❌ INVALID PARAMS");
      return false;
    }

    let result = false;
    switch (cur) {
      case "BTC": result = await checkBTC(wallet, amount); break;
      case "ETH": result = await checkEVM(wallet, amount, API.ETHEREUM_RPC, "ETH"); break;
      case "MATIC": result = await checkEVM(wallet, amount, API.MATIC_RPC, "MATIC"); break;
      case "SOL": result = await checkSOL(wallet, amount); break;
    }

    log(wallet, cur, amount, result ? "✅ PAID" : "❌ NOT PAID");

    if (result && bot && BOT.ADMIN_ID) {
      const time = new Date().toLocaleString("en-GB");
      bot.sendMessage(
        BOT.ADMIN_ID,
        `✅ *Payment confirmed*\n\n• Currency: *${cur}*\n• Amount: *${amount}*\n• Wallet: \`${wallet}\`\n• Time: ${time}`,
        { parse_mode: "Markdown" }
      ).catch(() => {});
    }

    return result;
  } catch (err) {
    console.error(`❌ [checkPayment error → ${currency}]:`, err.message || err);
    log(wallet, currency, expectedAmount, "❌ ERROR");
    return false;
  }
}

/**
 * ✅ BTC balance checker
 */
async function checkBTC(address, expected) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API.BTC_RPC}${address}`, { signal: controller.signal });
    clearTimeout(timeout);

    const text = await res.text();
    const satoshis = parseInt(text);
    return Number.isFinite(satoshis) && (satoshis / 1e8) >= expected;
  } catch (err) {
    console.error("❌ [BTC error]:", err.message || err);
    return false;
  }
}

/**
 * ✅ ETH / MATIC checker via JSON-RPC
 */
async function checkEVM(address, expected, rpcUrl, label) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [address, "latest"]
      })
    });
    clearTimeout(timeout);

    const data = await res.json();
    const hex = data?.result;
    const wei = parseInt(hex, 16);

    return Number.isFinite(wei) && (wei / 1e18) >= expected;
  } catch (err) {
    console.error(`❌ [${label} error]:`, err.message || err);
    return false;
  }
}

/**
 * ✅ SOL balance checker via JSON-RPC
 */
async function checkSOL(address, expected) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(API.SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address]
      })
    });
    clearTimeout(timeout);

    const data = await res.json();
    const lamports = data?.result?.value;
    return Number.isFinite(lamports) && (lamports / 1e9) >= expected;
  } catch (err) {
    console.error("❌ [SOL error]:", err.message || err);
    return false;
  }
}

/**
 * ✅ Logs all results into persistent file
 */
function log(wallet, currency, amount, status) {
  try {
    if (!fs.existsSync(path.dirname(logPath))) {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
    }

    const time = new Date().toISOString();
    const logLine = `${time} | ${currency} | ${amount} | ${wallet} | ${status}\n`;
    fs.appendFileSync(logPath, logLine, "utf8");
  } catch (err) {
    console.warn("⚠️ [Log error]:", err.message || err);
  }
}
