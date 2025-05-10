// 📦 utils/cryptoChecker.js | IMMORTAL FINAL v999999999999 — BULLETPROOF SYNC LOCKED

import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { API, BOT } from "../config/config.js";

// 📍 Log failas
const logPath = path.join(process.cwd(), "logs", "cryptoChecks.log");

// ✅ Palaikomi tinklai (atspindi fetchCryptoPrice.js ID mapping)
const SUPPORTED = {
  BTC: true,
  ETH: true,
  MATIC: true,
  SOL: true
};

/**
 * ✅ Tikrina ar wallet'e pakanka lėšų (pagal tinklą ir valiutą)
 */
export async function checkPayment(wallet, currency, expectedAmount, bot = null) {
  try {
    const cur = String(currency || "").toUpperCase().trim();
    const amount = parseFloat(expectedAmount);

    if (
      !wallet || typeof wallet !== "string" || wallet.length < 8 ||
      !SUPPORTED[cur] ||
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
      default:
        log(wallet, cur, amount, "❌ UNSUPPORTED CURRENCY");
        return false;
    }

    log(wallet, cur, amount, result ? "✅ PAID" : "❌ NOT PAID");

    if (result && bot?.sendMessage && BOT.ADMIN_ID) {
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
 * ✅ BTC (blockchain.info API, satoshis → BTC)
 */
async function checkBTC(address, expected) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API.BTC_RPC}${address}`, { signal: controller.signal });
    clearTimeout(timeout);

    const satoshis = parseInt(await res.text());
    if (!Number.isFinite(satoshis)) throw new Error("Invalid BTC satoshis");

    const btc = satoshis / 1e8;
    return btc >= expected;
  } catch (err) {
    console.error("❌ [BTC error]:", err.message || err);
    return false;
  }
}

/**
 * ✅ ETH / MATIC balansas per RPC (wei → ETH/MATIC)
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

    const json = await res.json();
    const hex = json?.result;
    if (!hex || typeof hex !== "string") {
      throw new Error("Invalid hex from EVM RPC");
    }

    const wei = parseInt(hex, 16);
    const value = wei / 1e18;

    if (!Number.isFinite(value)) throw new Error("Invalid parsed EVM balance");

    return value >= expected;
  } catch (err) {
    console.error(`❌ [${label} error]:`, err.message || err);
    return false;
  }
}

/**
 * ✅ SOL balansas per RPC (lamports → SOL)
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

    const json = await res.json();
    const lamports = json?.result?.value;
    if (!Number.isFinite(lamports)) throw new Error("Invalid lamports");

    const sol = lamports / 1e9;
    return sol >= expected;
  } catch (err) {
    console.error("❌ [SOL error]:", err.message || err);
    return false;
  }
}

/**
 * 🧾 Įrašo log į failą
 */
function log(wallet, currency, amount, status) {
  try {
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const time = new Date().toISOString();
    const entry = `${time} | ${currency} | ${amount} | ${wallet} | ${status}\n`;
    fs.appendFileSync(logPath, entry, "utf8");
  } catch (err) {
    console.warn("⚠️ [log error]:", err.message || err);
  }
}
