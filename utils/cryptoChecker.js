// 📦 utils/cryptoChecker.js | FINAL v3.5 — IMMORTAL BULLETPROOF PAYMENT CORE LOCKED

import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { API, BOT } from "../config/config.js";

// 🧾 Log failo kelias
const logPath = path.join(process.cwd(), "logs", "cryptoChecks.log");

/**
 * ✅ Patikrina ar mokėjimas gautas
 */
export async function checkPayment(wallet, currency, expectedAmount, bot = null) {
  try {
    const amount = parseFloat(expectedAmount);
    const cur = currency?.toUpperCase();

    if (
      !wallet || typeof wallet !== "string" || wallet.length < 8 ||
      !["BTC", "ETH", "MATIC", "SOL"].includes(cur) ||
      !Number.isFinite(amount) || amount <= 0
    ) {
      log(wallet, cur, amount, "❌ INVALID PARAMS");
      return false;
    }

    let result = false;
    switch (cur) {
      case "BTC":
        result = await checkBTC(wallet, amount);
        break;
      case "ETH":
        result = await checkEVM(wallet, amount, API.ETHEREUM_RPC, "ETH");
        break;
      case "MATIC":
        result = await checkEVM(wallet, amount, API.MATIC_RPC, "MATIC");
        break;
      case "SOL":
        result = await checkSOL(wallet, amount);
        break;
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
 * ✅ BTC — tikrina balanso satoshis per blockchain.info
 */
async function checkBTC(address, expected) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API.BTC_RPC}${address}`, { signal: controller.signal });
    clearTimeout(timeout);

    const satoshis = parseInt(await res.text());
    return Number.isFinite(satoshis) && (satoshis / 1e8) >= expected;
  } catch (err) {
    console.error("❌ [BTC error]:", err.message || err);
    return false;
  }
}

/**
 * ✅ ETH / MATIC JSON-RPC balansų tikrinimas
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
 * ✅ SOL — tikrina balansą RPC būdu
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
 * 📁 Įrašo rezultatą į `logs/cryptoChecks.log`
 */
function log(wallet, currency, amount, status) {
  try {
    if (!fs.existsSync(path.dirname(logPath))) {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
    }

    const time = new Date().toISOString();
    const entry = `${time} | ${currency} | ${amount} | ${wallet} | ${status}\n`;
    fs.appendFileSync(logPath, entry, "utf8");
  } catch (err) {
    console.warn("⚠️ [log error]:", err.message || err);
  }
}
