// 📦 index.js | BalticPharmaBot — FINAL IMMORTAL v3.0.9999999 DEPLOY-TITANLOCK™

import dotenv from "dotenv";
dotenv.config();

import { readFile } from "fs/promises";
import { initBotInstance, BOT } from "./config/config.js";
import { registerMainHandler } from "./core/handlers/mainHandler.js";
import { autoExpireSessions } from "./core/sessionManager.js";

// 🧠 Init + register
initBotInstance();
registerMainHandler(BOT.INSTANCE);

// 🔁 Auto-expire inactive sessions every 10 minutes
setInterval(() => {
  try {
    autoExpireSessions();
  } catch (err) {
    console.error("❌ [autoExpireSessions error]:", err.message);
  }
}, 10 * 60 * 1000);

// 🚀 Startup sequence
(async () => {
  try {
    if (!BOT.INSTANCE?.getMe) throw new Error("BOT.INSTANCE is unavailable.");

    const me = await BOT.INSTANCE.getMe();
    const version = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"))?.version || "1.0.0";
    const now = new Date().toLocaleString("en-GB");

    console.log(`
╔═════════════════════════════════════════════╗
║ ✅ BALTICPHARMACYBOT IS RUNNING — IMMORTAL ║
╚═════════════════════════════════════════════╝
🆙 Version: v${version}
🕒 Started: ${now}
👤 Logged in as: @${me.username} (${me.first_name})
    `.trim());

    if (BOT.ADMIN_ID && !isNaN(BOT.ADMIN_ID)) {
      await BOT.INSTANCE.sendMessage(
        BOT.ADMIN_ID,
        `✅ *BalticPharmacyBot v${version}* successfully launched!\n🕒 *${now}*`,
        { parse_mode: "Markdown" }
      ).catch((e) => {
        console.warn("⚠️ Failed to notify admin:", e.message);
      });
    }

  } catch (err) {
    console.error("❌ [Startup crash]:", err.message || err);
    await notifyCrash("startup", err);
    process.exit(1);
  }
})();

// 🛑 Global crash catchers
process.on("uncaughtException", async (err) => {
  console.error("❌ [UNCAUGHT EXCEPTION]:", err);
  await notifyCrash("uncaughtException", err);
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  console.error("❌ [UNHANDLED REJECTION]:", reason);
  await notifyCrash("unhandledRejection", reason);
  process.exit(1);
});

// 🔁 Graceful shutdown (SIGINT, etc.)
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((sig) => {
  process.on(sig, async () => {
    console.log(`\n🛑 Signal received (${sig}) → stopping bot...`);
    try {
      await BOT.INSTANCE?.stopPolling();
      console.log("✅ Bot stopped cleanly.");
    } catch (err) {
      console.warn("⚠️ Shutdown error:", err.message);
    }
    process.exit(0);
  });
});

// ✅ Launch log
console.log("✅ BALTICPHARMACYBOT — LIVE • LOCKED • BULLETPROOF");

/**
 * 🔔 Sends crash info to admin
 */
async function notifyCrash(type, err) {
  if (!BOT.ADMIN_ID || !BOT.INSTANCE?.sendMessage) return;

  const msg = `❗️ *Bot crashed during ${type}!*\n\n💥 Error: \`${err?.message || err}\`\n🕒 ${new Date().toLocaleString("en-GB")}`;
  try {
    await BOT.INSTANCE.sendMessage(BOT.ADMIN_ID, msg, { parse_mode: "Markdown" });
  } catch {
    console.warn("⚠️ Failed to notify admin.");
  }
}
