// 📦 index.js | BalticPharmacyBot — IMMORTAL FINAL v1.0.5•GODMODE+TITANLOCK+QRREADY+PERSIST
// 24/7 BULLETPROOF • ADMIN NOTIFY • NEW USER TRACKING • QR CACHE SYSTEM • DIAMONDLOCK SYSTEM

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { readFile, writeFile } from "fs/promises";
import { initBotInstance, BOT } from "./config/config.js";
import { registerMainHandler } from "./core/handlers/mainHandler.js";
import { autoExpireSessions, cleanStalePaymentTimers } from "./core/sessionManager.js";
import { sendAdminPing } from "./core/handlers/paymentHandler.js";
import { startQrCacheRefresher } from "./jobs/refreshQrCache.js";
import "./config/discountSync.js";

// ✅ Persistent set of joined users
const NEW_USERS_FILE = "./.newusers.json";
let newUserSet = new Set();

try {
  const raw = fs.existsSync(NEW_USERS_FILE) ? fs.readFileSync(NEW_USERS_FILE, "utf8") : "[]";
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) newUserSet = new Set(parsed);
} catch (err) {
  console.warn("⚠️ Failed to read .newusers.json", err.message);
}

/**
 * 🔔 Crash + rejection notifier (no admin notifications)
 */
async function notifyCrash(source, err) {
  console.error(`💥 [CRASH during ${source}]:`, err);
}

// 🔧 Init & main logic boot
(async () => {
  try {
    initBotInstance();

    // ✅ JOIN TRACKING (ADMIN SKIP, persistent memory)
    BOT.INSTANCE.on("message", async (msg) => {
      const uid = msg?.from?.id;
      const adminId = process.env.ADMIN_ID || process.env.BOT_ADMIN_ID;
      if (!uid || String(uid) === String(adminId) || newUserSet.has(uid)) return;

      newUserSet.add(uid);
      try {
        await writeFile(NEW_USERS_FILE, JSON.stringify([...newUserSet]), "utf8");
      } catch (err) {
        console.warn("⚠️ Failed to save .newusers.json", err.message);
      }

      const timestamp = new Date().toLocaleString("en-GB");
      await sendAdminPing(
        `🆕 *New user joined*\n` +
        `👤 UID: \`${uid}\`\n` +
        `🕒 Joined: ${timestamp}`
      );
    });

    registerMainHandler(BOT.INSTANCE);

    // ♻️ Auto-expire zombie/idle sessions every 10 minutes
    setInterval(() => {
      try {
        autoExpireSessions();
      } catch (err) {
        console.error("❌ [autoExpireSessions crash]", err);
      }
    }, 10 * 60 * 1000);

    // 🧹 Clean up any stale payment timers every 5 minutes
    setInterval(() => {
      try {
        cleanStalePaymentTimers();
      } catch (err) {
        console.error("❌ [cleanStalePaymentTimers crash]", err);
      }
    }, 5 * 60 * 1000);

    // ✅ Start QR fallback refresher job
    startQrCacheRefresher();

    // 🚀 Startup check + logging
    const me = await BOT.INSTANCE.getMe();
    const pkg = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
    const version = pkg.version || "1.0.0";
    const now = new Date().toLocaleString("en-GB");

    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║ ✅ BALTICPHARMACYBOT LIVE — FINAL IMMORTAL v${version} GODMODE + DIAMONDLOCK ║
╚════════════════════════════════════════════════════════════════════════════╝
🆙 Version: v${version}
🕒 Started: ${now}
👤 Logged in as: @${me.username} (${me.first_name})
`.trim());

    await sendAdminPing(`✅ Bot started successfully\nVersion: *v${version}*\n🕒 ${now}`);

    // ✅ Delayed memory-ready alert (12min RAM warmup)
    setTimeout(() => {
      sendAdminPing("✅ Bot fully ready (RAM warmed up, timers running, FSM live).");
    }, 12 * 60 * 1000);

  } catch (err) {
    console.error("💥 [BOOT ERROR]:", err);
    await sendAdminPing(`❌ Bot failed to start:\n\`\`\`\n${err.message}\n\`\`\``);
    await notifyCrash("boot", err);
    process.exit(1);
  }
})();

// 🛡️ Global error catchers
process.on("uncaughtException", async (err) => {
  console.error("❌ [UNCAUGHT EXCEPTION]", err);
  await notifyCrash("uncaughtException", err);
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  console.error("❌ [UNHANDLED REJECTION]", reason);
  await notifyCrash("unhandledRejection", reason);
  process.exit(1);
});

// 🛑 Graceful shutdowns
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((sig) =>
  process.on(sig, async () => {
    console.log(`\n🛑 Signal received (${sig}) → stopping bot...`);
    try {
      await BOT.INSTANCE.stopPolling();
      console.log("✅ Bot stopped gracefully.");
    } catch (err) {
      console.warn("⚠️ Graceful shutdown error:", err);
    }
    process.exit(0);
  })
);

console.log("✅ BALTICPHARMACYBOT READY • LOCKED • BULLETPROOF • ∞");
