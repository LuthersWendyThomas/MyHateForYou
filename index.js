// 📦 index.js | BalticPharmacyBot — IMMORTAL FINAL v999999999999999.∞+GODMODE+TITANLOCK+SYNC
// 24/7 BULLETPROOF • ADMIN NOTIFIER • AUTO-RESILIENT • MAX DIAGNOSTICS

import dotenv from "dotenv";
dotenv.config();

import { readFile } from "fs/promises";
import { initBotInstance, BOT } from "./config/config.js";
import { registerMainHandler } from "./core/handlers/mainHandler.js";
import { autoExpireSessions } from "./core/sessionManager.js";
import "./config/discountSync.js"; // ⛓️ Always last: pulls latest live discount state

// 🔔 Crash + rejection notifier
async function notifyCrash(source, err) {
  const now = new Date().toLocaleString("en-GB");
  const msg = `❗️ *Bot crashed during ${source}!*\n\n💥 Error: \`${err?.message || err}\`\n🕒 ${now}`;

  try {
    if (BOT.ADMIN_ID && BOT.INSTANCE?.sendMessage) {
      await BOT.INSTANCE.sendMessage(BOT.ADMIN_ID, msg, { parse_mode: "Markdown" });
    }
  } catch {
    console.warn("⚠️ Failed to notify admin about crash.");
  }
}

// 🔧 Init & main logic boot
try {
  initBotInstance();
  registerMainHandler(BOT.INSTANCE);

  // ♻️ Auto-expire zombie/idle sessions every 10 minutes
  setInterval(() => {
    try {
      autoExpireSessions();
    } catch (err) {
      console.error("❌ [autoExpireSessions crash]", err.message || err);
    }
  }, 10 * 60 * 1000);

  // 🚀 Startup check + logging + admin ping
  (async () => {
    try {
      if (!BOT.INSTANCE?.getMe) throw new Error("BOT.INSTANCE not initialized");

      const me = await BOT.INSTANCE.getMe();
      const version = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"))?.version || "1.0.0";
      const now = new Date().toLocaleString("en-GB");

      console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║ ✅ BALTICPHARMACYBOT LIVE — FINAL IMMORTAL v${version} GODMODE + DIAMONDLOCK ║
╚════════════════════════════════════════════════════════════════════════════╝
🆙 Version: v${version}
🕒 Started: ${now}
👤 Logged in as: @${me.username} (${me.first_name})
`.trim());

      if (BOT.ADMIN_ID && !isNaN(BOT.ADMIN_ID)) {
        await BOT.INSTANCE.sendMessage(
          BOT.ADMIN_ID,
          `✅ *BalticPharmacyBot v${version}* successfully launched!\n🕒 *${now}*`,
          { parse_mode: "Markdown" }
        ).catch((e) =>
          console.warn("⚠️ Admin startup ping failed:", e.message || e)
        );
      }
    } catch (err) {
      console.error("❌ [Startup crash]:", err.message || err);
      await notifyCrash("startup", err);
      process.exit(1);
    }
  })();
} catch (fatal) {
  console.error("💥 [FATAL BOOT ERROR]:", fatal.message || fatal);
  await notifyCrash("boot", fatal);
  process.exit(1);
}

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
      await BOT.INSTANCE?.stopPolling();
      console.log("✅ Bot stopped gracefully.");
    } catch (err) {
      console.warn("⚠️ Graceful shutdown error:", err.message);
    }
    process.exit(0);
  })
);

console.log("✅ BALTICPHARMACYBOT READY • LOCKED • BULLETPROOF • ∞");
