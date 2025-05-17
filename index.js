// 📦 index.js | BalticPharmacyBot — IMMORTAL FINAL v1.2.9•GODMODE•DIAMONDLOCK•WOWUI•SIGTERM∞•409SAFE

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { readFile, writeFile } from "fs/promises";
import { initBotInstance, startSafePolling, BOT } from "./config/config.js";
import { registerMainHandler } from "./core/handlers/mainHandler.js";
import { autoExpireSessions, cleanStalePaymentTimers } from "./core/sessionManager.js";
import { sendAdminPing } from "./core/handlers/paymentHandler.js";
import { startQrValidationAndRefresh } from "./jobs/validateAndRefresh.js";
import { initQrCacheDir, generateFullQrCache, validateQrFallbacks } from "./utils/qrCacheManager.js";
import "./config/discountSync.js";

const NEW_USERS_FILE = "./.newusers.json";
let newUserSet = new Set();
try {
  const raw = fs.existsSync(NEW_USERS_FILE) ? fs.readFileSync(NEW_USERS_FILE, "utf8") : "[]";
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) newUserSet = new Set(parsed);
} catch (err) {
  console.warn("\x1b[43m\x1b[30m ⚠️ Failed to read .newusers.json: " + err.message + " \x1b[0m");
}

let last409Time = 0;

function logSoft409Conflict(message) {
  const now = new Date().toLocaleString("en-GB");
  const nowMs = Date.now();
  if (nowMs - last409Time < 30000) return;
  last409Time = nowMs;
  console.warn(`\x1b[43m\x1b[30m ⚠️ 409 CONFLICT — ${message} | ${now} \x1b[0m`);
}

(async () => {
  try {
    initBotInstance();
    await startSafePolling(BOT.INSTANCE);

    BOT.INSTANCE.on("message", async (msg) => {
      const uid = msg?.from?.id;
      const adminId = process.env.ADMIN_ID || process.env.BOT_ADMIN_ID;
      if (!uid || String(uid) === String(adminId) || newUserSet.has(uid)) return;

      newUserSet.add(uid);
      try {
        await writeFile(NEW_USERS_FILE, JSON.stringify([...newUserSet]), "utf8");
      } catch (err) {
        console.warn("\x1b[43m\x1b[30m ⚠️ Failed to save .newusers.json: " + err.message + " \x1b[0m");
      }

      const timestamp = new Date().toLocaleString("en-GB");
      await sendAdminPing(`🆕 *New user joined*\n👤 UID: \`${uid}\`\n🕒 Joined: ${timestamp}`);
    });

    BOT.INSTANCE.on("polling_error", async (err) => {
      const msg = err?.message || String(err || "");
      if (msg.includes("409") && msg.includes("getUpdates")) {
        logSoft409Conflict("BOT ALREADY POLLING");
        return;
      }
      const now = new Date().toLocaleString("en-GB");
      console.error(`\x1b[41m\x1b[30m 💥 POLLING ERROR | ${now} | ${msg} \x1b[0m`);
    });

    try {
      registerMainHandler(BOT.INSTANCE);
      const me = await BOT.INSTANCE.getMe();
      const pkg = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
      const version = pkg.version || "1.0.0";
      const now = new Date().toLocaleString("en-GB");

      console.log(`\x1b[44m\x1b[30m ✅ BALTICPHARMACYBOT LIVE • v${version} • Started: ${now} • Logged in as: @${me.username} \x1b[0m`);
      await sendAdminPing(`✅ Bot started successfully\nVersion: *v${version}*\n🕒 ${now}`);
      setTimeout(() => sendAdminPing("✅ Bot fully ready (RAM warmed up, timers running, FSM live)."), 12 * 60 * 1000);
    } catch (initErr) {
      const msg = initErr?.message || String(initErr);
      console.error(`\x1b[41m\x1b[30m 💥 BOT INIT FAILURE | ${new Date().toLocaleString("en-GB")} | ${msg} \x1b[0m`);
      process.exit(1);
    }

    setInterval(() => {
      try {
        autoExpireSessions();
      } catch (err) {
        console.error(`\x1b[41m\x1b[30m ❌ [autoExpireSessions crash]: ${err.message} \x1b[0m`);
      }
    }, 10 * 60 * 1000);

    setInterval(() => {
      try {
        cleanStalePaymentTimers();
      } catch (err) {
        console.error(`\x1b[41m\x1b[30m ❌ [cleanStalePaymentTimers crash]: ${err.message} \x1b[0m`);
      }
    }, 5 * 60 * 1000);

    startQrValidationAndRefresh();

    setTimeout(async () => {
      console.log("\x1b[44m\x1b[30m ⏳ Delayed QR fallback generation starting... \x1b[0m");
      try {
        await initQrCacheDir();
        await generateFullQrCache();
        await validateQrFallbacks(true);
        console.log("\x1b[42m\x1b[30m ✅ Delayed QR fallback generation complete and validated. \x1b[0m");
      } catch (err) {
        console.error(`\x1b[41m\x1b[30m ❌ Delayed QR cache generation failed: ${err.message} \x1b[0m`);
      }
    }, 180_000);

  } catch (err) {
    const msg = err?.message || String(err);
    console.error(`\x1b[41m\x1b[30m 💥 CRITICAL STARTUP ERROR | ${new Date().toLocaleString("en-GB")} | ${msg} \x1b[0m`);
    process.exit(1);
  }
})();

process.on("uncaughtException", async (err) => {
  const msg = err?.message || String(err);
  console.error(`\x1b[41m\x1b[30m 💥 UNCAUGHT EXCEPTION | ${new Date().toLocaleString("en-GB")} | ${msg} \x1b[0m`);
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  const msg = reason?.message || String(reason);
  console.error(`\x1b[41m\x1b[30m 💥 UNHANDLED REJECTION | ${new Date().toLocaleString("en-GB")} | ${msg} \x1b[0m`);
  process.exit(1);
});

["SIGINT", "SIGTERM", "SIGQUIT"].forEach(sig =>
  process.on(sig, async () => {
    const ts = new Date().toLocaleString("en-GB");
    console.log(`\x1b[41m\x1b[30m 🛑 SHUTDOWN SIGNAL RECEIVED: ${sig} | ${ts} | Stopping gracefully... \x1b[0m`);

    try {
      await BOT.INSTANCE.stopPolling();
      await BOT.INSTANCE.close();
    } catch (err) {
      console.warn(`\x1b[43m\x1b[30m ⚠️ Graceful shutdown error: ${err.message} \x1b[0m`);
    }

    console.log(`\x1b[42m\x1b[30m ✅ BOT SHUTDOWN COMPLETE — SAFE EXIT @ ${ts} \x1b[0m`);

    setTimeout(() => process.exit(0), 1000);
  })
);

console.log("\x1b[44m\x1b[30m ✅ BALTICPHARMACYBOT READY • LOCKED • BULLETPROOF • v1.3.1 \x1b[0m");
