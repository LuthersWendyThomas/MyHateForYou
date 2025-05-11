import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { API, BOT, ALIASES } from "../config/config.js";

const logPath = path.join(process.cwd(), "logs", "cryptoChecks.log");

const SUPPORTED = {
  BTC: true,
  ETH: true,
  MATIC: true,
  SOL: true
};

export async function checkPayment(wallet, currency, expectedAmount, bot = null) {
  const input = String(currency || "").trim().toLowerCase();
  const cur = ALIASES[input] || input.toUpperCase();
  const amount = parseFloat(expectedAmount);

  if (
    !wallet || typeof wallet !== "string" || wallet.length < 8 ||
    !SUPPORTED[cur] || !Number.isFinite(amount) || amount <= 0
  ) {
    log(wallet, cur, amount, "❌ INVALID PARAMS");
    return false;
  }

  try {
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
        log(wallet, cur, amount, "❌ UNSUPPORTED");
        return false;
    }

    log(wallet, cur, amount, result ? "✅ PAID" : "❌ NOT PAID");

    if (result && bot?.sendMessage && BOT.ADMIN_ID) {
      const time = new Date().toLocaleString("en-GB");
      bot.sendMessage(
        BOT.ADMIN_ID,
        `✅ *Payment confirmed*\n\n• Currency: *${cur}*\n• Amount: *${amount}*\n• Wallet: \`${wallet}\`\n• Time: ${time}`,
        { parse_mode: "Markdown" }
      ).catch(err => console.warn("⚠️ [Bot notify error]", err.message));
    }

    return result;
  } catch (err) {
    console.error(`❌ [checkPayment fatal → ${cur}]:`, err.message);
    log(wallet, cur, amount, "❌ ERROR");
    return false;
  }
}

async function checkBTC(address, expected) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API.BTC_RPC}${address}`, { signal: controller.signal });
    clearTimeout(timeout);

    const satoshis = parseInt(await res.text(), 10);
    if (!Number.isFinite(satoshis)) throw new Error("Invalid satoshi balance");

    const btc = satoshis / 1e8;
    return btc >= expected;
  } catch (err) {
    console.error("❌ [BTC error]:", err.message);
    return false;
  }
}

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
    if (!hex || typeof hex !== "string") throw new Error(`Invalid ${label} hex`);

    const wei = parseInt(hex, 16);
    const ethVal = wei / 1e18;
    return ethVal >= expected;
  } catch (err) {
    console.error(`❌ [${label} error]:`, err.message);
    return false;
  }
}

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
    if (!Number.isFinite(lamports)) throw new Error("Invalid SOL lamports");

    const sol = lamports / 1e9;
    return sol >= expected;
  } catch (err) {
    console.error("❌ [SOL error]:", err.message);
    return false;
  }
}

function log(wallet, currency, amount, status) {
  try {
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const time = new Date().toISOString();
    const entry = `${time} | ${currency} | ${amount} | ${wallet} | ${status}\n`;
    fs.appendFileSync(logPath, entry, "utf8");
  } catch (err) {
    console.warn("⚠️ [log error]:", err.message);
  }
}
