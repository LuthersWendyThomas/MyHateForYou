// 📦 index.js | BalticPharmacyBot — FINAL IMMORTAL v1.0.7•DIAMONDLOCK•QRFALLBACKFIX
// 24/7 BULLETPROOF • ADMIN NOTIFY • JOIN TRACKING • QR SYSTEM READY • FULL PERSISTENCE

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import express from "express";
import { readFile, writeFile } from "fs/promises";
import { initBotInstance, BOT } from "./config/config.js";
import { registerMainHandler } from "./core/handlers/mainHandler.js";
import { autoExpireSessions, cleanStalePaymentTimers } from "./core/sessionManager.js";
import { sendAdminPing } from "./core/handlers/paymentHandler.js";
import { startQrCacheMaintenance } from "./jobs/qrCacheMaintainer.js";
import { initQrCacheDir } from "./utils/qrCacheManager.js";
import "./config/discountSync.js";

// ✅ Healthcheck for Render
const app = express();
app.get("/healthz", (_, res) => res.send("OK"));
app.listen(3000, () => console.log("✅ Healthcheck ready on :3000"));

// ✅ Persistent user tracker
const NEW_USERS_FILE = "./.newusers.json";
let newUserSet = new Set();
try {
  const raw = fs.existsSync(NEW_USERS_FILE) ? fs.readFileSync(NEW_USERS_FILE, "utf8") : "[]";
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) newUserSet = new Set(parsed);
} catch (err) {
  console.warn("⚠️ Failed to read .newusers.json:", err.message);
}

async function notifyCrash(source, err) {
  const msg = typeof err === "object" && err !== null ? err.message || JSON.stringify(err) : String(err);
  console.error(`💥 [CRASH during ${source}]:`, msg);
  try {
    await sendAdminPing(`❌ *${source.toUpperCase()} CRASH:*\n\`\`\`\n${msg}\n\`\`\``);
  } catch {}
}

(async () => {
  try {
    initBotInstance();

    await initQrCacheDir();

    BOT.INSTANCE.on("message", async (msg) => {
      const uid = msg?.from?.id;
      const adminId = process.env.ADMIN_ID || process.env.BOT_ADMIN_ID;
      if (!uid || String(uid) === String(adminId) || newUserSet.has(uid)) return;

      newUserSet.add(uid);
      try {
        await writeFile(NEW_USERS_FILE, JSON.stringify([...newUserSet]), "utf8");
      } catch (err) {
        console.warn("⚠️ Failed to save .newusers.json:", err.message);
      }

      const timestamp = new Date().toLocaleString("en-GB");
      await sendAdminPing(`🆕 *New user joined*\n👤 UID: \`${uid}\`\n🕒 Joined: ${timestamp}`);
    });

    registerMainHandler(BOT.INSTANCE);

    setInterval(() => {
      try {
        autoExpireSessions();
      } catch (err) {
        console.error("❌ [autoExpireSessions crash]:", err);
      }
    }, 10 * 60 * 1000);

    setInterval(() => {
      try {
        cleanStalePaymentTimers();
      } catch (err) {
        console.error("❌ [cleanStalePaymentTimers crash]:", err);
      }
    }, 5 * 60 * 1000);

    startQrCacheMaintenance();

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

    setTimeout(() => {
      sendAdminPing("✅ Bot fully ready (RAM warmed up, timers running, FSM live).");
    }, 12 * 60 * 1000);

  } catch (err) {
    await notifyCrash("boot", err);
    process.exit(1);
  }
})();

// 🛡️ Global failsafes
process.on("uncaughtException", async (err) => {
  await notifyCrash("uncaughtException", err);
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  const error =
    reason instanceof AggregateError
      ? reason.errors?.map(e => e?.message || String(e)).join(" | ")
      : reason?.message || String(reason);
  await notifyCrash("unhandledRejection", error);
  process.exit(1);
});

["SIGINT", "SIGTERM", "SIGQUIT"].forEach(sig =>
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
