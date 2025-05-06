// 📦 config/config.js — FINAL IMMORTAL MIRROR-SAFE VERSION v2025.3

import { config } from "dotenv";
config();

import TelegramBot from "node-telegram-bot-api";

// ===============================
// ✅ Griežta ENV validacija
// ===============================
function requiredEnv(value, name) {
  if (!value || typeof value !== "string" || value.trim() === "") {
    console.error(`❌ Trūksta arba neteisingas ENV kintamasis: ${name}`);
    process.exit(1);
  }
  return value.trim();
}

// ===============================
// 🔐 Tokenai / Administratorius
// ===============================
const token = requiredEnv(process.env.TELEGRAM_TOKEN, "TELEGRAM_TOKEN");
const adminId = requiredEnv(process.env.ADMIN_ID, "ADMIN_ID");

// ===============================
// 🤖 Botas — Inicializavimas vėliau
// ===============================
export const BOT = {
  TOKEN: token,
  ADMIN_ID: adminId,
  VERSION: "v2025.3",
  INSTANCE: null
};

export function initBotInstance() {
  if (!BOT.TOKEN) {
    console.error("❌ TOKEN neegzistuoja paleidimo metu.");
    process.exit(1);
  }

  BOT.INSTANCE = new TelegramBot(BOT.TOKEN, {
    polling: {
      interval: 300,
      autoStart: true,
      params: { timeout: 10 }
    }
  });

  console.log("✅ Telegram botas inicializuotas saugiai.");
}

// ===============================
// 💳 Kripto piniginės
// ===============================
export const WALLETS = {
  BTC: requiredEnv(process.env.BTC_WALLET, "BTC_WALLET"),
  ETH: requiredEnv(process.env.ETH_WALLET, "ETH_WALLET"),
  SOL: requiredEnv(process.env.SOL_WALLET, "SOL_WALLET"),
  MATIC: requiredEnv(process.env.MATIC_WALLET, "MATIC_WALLET")
};

// ===============================
// 🌐 API ir RPC adresai
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
// ⚙️ Feature jungikliai (tik aktyvūs)
// ===============================
export const FLAGS = {
  AUTOBAN_ENABLED: ["1", "true"].includes(String(process.env.AUTOBAN_ENABLED).toLowerCase()),
  AUTODELETE_ENABLED: ["1", "true"].includes(String(process.env.AUTODELETE_ENABLED).toLowerCase())
};

// ===============================
// 🌍 Miestų sąrašas
// ===============================
export const CITIES = process.env.CITIES
  ? process.env.CITIES.split(",").map(c => c.trim()).filter(Boolean)
  : ["Vilnius", "Kaunas"];
