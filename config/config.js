// 📦 config/config.js — IMMORTAL FINAL v2025.9999999 — BULLETPROOF TITANLOCK SYNCED

import { config } from "dotenv";
config();

import TelegramBot from "node-telegram-bot-api";

// ==============================
// 🔒 Required ENV validator
function requiredEnv(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    console.error(`❌ MISSING ENV: ${name}`);
    process.exit(1);
  }
  return value.trim();
}

// ==============================
// 🤖 BOT INSTANCE + META
const token = requiredEnv(process.env.TELEGRAM_TOKEN, "TELEGRAM_TOKEN");
const adminId = requiredEnv(process.env.ADMIN_ID, "ADMIN_ID");

export const BOT = {
  TOKEN: token,
  ADMIN_ID: adminId,
  VERSION: "v2025.9999999",
  INSTANCE: null
};

export function initBotInstance() {
  if (!BOT.TOKEN || typeof BOT.TOKEN !== "string") {
    console.error("❌ Invalid BOT TOKEN");
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

    console.log("✅ BOT initialized @", BOT.VERSION);
  } catch (err) {
    console.error("❌ BOT INIT FAILED:", err.message || err);
    process.exit(1);
  }
}

// ==============================
// 💳 WALLETS (required)
export const WALLETS = {
  BTC: requiredEnv(process.env.BTC_WALLET, "BTC_WALLET"),
  ETH: requiredEnv(process.env.ETH_WALLET, "ETH_WALLET"),
  MATIC: requiredEnv(process.env.MATIC_WALLET, "MATIC_WALLET"),
  SOL: requiredEnv(process.env.SOL_WALLET, "SOL_WALLET")
};

// ==============================
// 🌐 External APIs / RPCs
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

// ==============================
// 🧩 Unified currency aliases
export const ALIASES = {
  bitcoin: "BTC",
  btc: "BTC",
  ethereum: "ETH",
  eth: "ETH",
  polygon: "MATIC",
  "polygon-pos": "MATIC",
  matic: "MATIC",
  solana: "SOL",
  sol: "SOL"
};

// ==============================
// ⚙️ Feature flags (safe boolean)
export const FLAGS = {
  AUTOBAN_ENABLED: String(process.env.AUTOBAN_ENABLED).trim().toLowerCase() === "true",
  AUTODELETE_ENABLED: String(process.env.AUTODELETE_ENABLED).trim().toLowerCase() === "true"
};
