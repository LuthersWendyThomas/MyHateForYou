// 📦 config/config.js — IMMORTAL FINAL v2025.9999999 — BULLETPROOF TITANLOCK SYNCED + 409SAFE

import { config } from "dotenv";
config();

import fs from "fs";
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
  VERSION: "v2025.1.0.7",
  INSTANCE: null
};

// ——— INIT BOT INSTANCE (without polling yet)
export function initBotInstance() {
  if (!BOT.TOKEN || typeof BOT.TOKEN !== "string") {
    console.error("❌ Invalid BOT TOKEN");
    process.exit(1);
  }

  try {
    BOT.INSTANCE = new TelegramBot(BOT.TOKEN, {
      polling: false // ⛔ Polling bus paleidžiamas saugiai atskirai
    });

    console.log("✅ BOT initialized @", BOT.VERSION);
  } catch (err) {
    console.error("❌ BOT INIT FAILED:", err.message || err);
    process.exit(1);
  }
}

// ——— SAFE POLLING WRAPPER ✅ 409/429 protected
export async function startSafePolling(bot) {
  if (!bot || typeof bot.startPolling !== "function") {
    console.error("❌ [startSafePolling] Invalid bot instance provided.");
    process.exit(1);
  }

  try {
    await bot.deleteWebhook();    // 🧹 Remove webhook if set
    await bot.stopPolling();      // 🛑 Stop previous polling
    await bot.startPolling();     // 🚀 Start polling cleanly
    console.log("✅ [startSafePolling] Bot polling started safely.");
  } catch (err) {
    const msg = err?.message || String(err);
    if (msg.includes("409") || msg.includes("ETELEGRAM: 429")) {
      const now = new Date().toLocaleString("en-GB");
      console.warn(`⚠️ [startSafePolling] Conflict detected → ${msg} | ${now}`);
      process.exit(1); // 💥 Stop duplicate instance on Render
    } else {
      console.error("❌ [startSafePolling] Unknown polling error:", msg);
      process.exit(1);
    }
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
