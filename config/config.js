// 📦 config/config.js — FINAL IMMORTAL MIRROR-SAFE VERSION v2025.3

import { config } from "dotenv";
config();

import TelegramBot from "node-telegram-bot-api";

// ===============================
// ✅ Strict ENV validation
// ===============================
function requiredEnv(value, name) {
  if (!value || typeof value !== "string" || value.trim() === "") {
    console.error(`❌ Missing or invalid ENV variable: ${name}`);
    process.exit(1);
  }
  return value.trim();
}

// ===============================
// 🔐 Tokens / Administrator
// ===============================
const token = requiredEnv(process.env.TELEGRAM_TOKEN, "TELEGRAM_TOKEN");
const adminId = requiredEnv(process.env.ADMIN_ID, "ADMIN_ID");

// ===============================
// 🤖 Bot — Initialized later
// ===============================
export const BOT = {
  TOKEN: token,
  ADMIN_ID: adminId,
  VERSION: "v2025.3",
  INSTANCE: null
};

export function initBotInstance() {
  if (!BOT.TOKEN) {
    console.error("❌ TOKEN is missing at startup.");
    process.exit(1);
  }

  BOT.INSTANCE = new TelegramBot(BOT.TOKEN, {
    polling: {
      interval: 300,
      autoStart: true,
      params: { timeout: 10 }
    }
  });

  console.log("✅ Telegram bot initialized securely.");
}

// ===============================
// 💳 Crypto wallets
// ===============================
export const WALLETS = {
  BTC: requiredEnv(process.env.BTC_WALLET, "BTC_WALLET"),
  ETH: requiredEnv(process.env.ETH_WALLET, "ETH_WALLET"),
  SOL: requiredEnv(process.env.SOL_WALLET, "SOL_WALLET"),
  MATIC: requiredEnv(process.env.MATIC_WALLET, "MATIC_WALLET")
};

// ===============================
// 🌐 API and RPC URLs
// ===============================
export const API = {
  COINGECKO_URLS: [
    process.env.COINGECKO_URL?.trim() || "https://api.coingecko.com/api/v3/simple/price"
  ],
  BTC_RPC: process.env.BTC_RPC?.trim() || "https://blockchain.info/q/addressbalance/",
  ETHEREUM_RPC: requiredEnv(process.env.ETHEREUM_RPC, "ETHEREUM_RPC"),
  MATIC_RPC: requiredEnv(process.env.MATIC_RPC, "MATIC_RPC"),
  SOLANA_RPC: requiredEnv(process.env.SOLANA_RPC, "SOLANA_RPC")
};

// ===============================
// ⚙️ Feature flags (only active)
// ===============================
export const FLAGS = {
  AUTOBAN_ENABLED: ["1", "true"].includes(String(process.env.AUTOBAN_ENABLED).toLowerCase()),
  AUTODELETE_ENABLED: ["1", "true"].includes(String(process.env.AUTODELETE_ENABLED).toLowerCase())
};

// ===============================
// 🌍 List of available cities
// ===============================
export const CITIES = process.env.CITIES
  ? process.env.CITIES.split(",").map(c => c.trim()).filter(Boolean)
  : ["Vilnius", "Kaunas"];
