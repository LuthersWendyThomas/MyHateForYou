// 📦 config/config.js — FINAL IMMORTAL BULLETPROOF v2025.5

import { config } from "dotenv";
config();

import TelegramBot from "node-telegram-bot-api";

// ===============================
// ✅ ENV Validator (strict)
function requiredEnv(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    console.error(`❌ Missing ENV: ${name}`);
    process.exit(1);
  }
  return value.trim();
}

// ===============================
// 🔐 Tokens / Admin ID
const token = requiredEnv(process.env.TELEGRAM_TOKEN, "TELEGRAM_TOKEN");
const adminId = requiredEnv(process.env.ADMIN_ID, "ADMIN_ID");

// ===============================
// 🤖 Bot Metadata + Instance
export const BOT = {
  TOKEN: token,
  ADMIN_ID: adminId,
  VERSION: "v2025.5",
  INSTANCE: null
};

export function initBotInstance() {
  if (!BOT.TOKEN || typeof BOT.TOKEN !== "string") {
    console.error("❌ BOT token missing or invalid at startup.");
    process.exit(1);
  }

  try {
    BOT.INSTANCE = new TelegramBot(BOT.TOKEN, {
      polling: {
        interval: 300,
        autoStart: true,
        params: { timeout: 10 }
      }
    });

    console.log("✅ Telegram bot initialized securely.");
  } catch (err) {
    console.error("❌ Failed to initialize Telegram bot:", err.message);
    process.exit(1);
  }
}

// ===============================
// 💳 Wallets — required
export const WALLETS = {
  btc: requiredEnv(process.env.BTC_WALLET, "BTC_WALLET"),
  eth: requiredEnv(process.env.ETH_WALLET, "ETH_WALLET"),
  sol: requiredEnv(process.env.SOL_WALLET, "SOL_WALLET"),
  matic: requiredEnv(process.env.MATIC_WALLET, "MATIC_WALLET")
};

// ===============================
// 🌐 External APIs and RPCs
export const API = {
  COINGECKO_URLS: (
    process.env.COINGECKO_URL?.trim()
      ? [process.env.COINGECKO_URL.trim()]
      : ["https://api.coingecko.com/api/v3/simple/price"]
  ),
  BTC_RPC: process.env.BTC_RPC?.trim() || "https://blockchain.info/q/addressbalance/",
  ETHEREUM_RPC: requiredEnv(process.env.ETHEREUM_RPC, "ETHEREUM_RPC"),
  MATIC_RPC: requiredEnv(process.env.MATIC_RPC, "MATIC_RPC"),
  SOLANA_RPC: requiredEnv(process.env.SOLANA_RPC, "SOLANA_RPC")
};

// ===============================
// ⚙️ Feature flags (boolean-safe)
export const FLAGS = {
  AUTOBAN_ENABLED: String(process.env.AUTOBAN_ENABLED).trim().toLowerCase() === "true",
  AUTODELETE_ENABLED: String(process.env.AUTODELETE_ENABLED).trim().toLowerCase() === "true"
};
