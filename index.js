// 📦 index.js | BalticPharmaBot — FINAL IMMORTAL v1.0.0 LOCKED DEPLOY-TITAN™

import dotenv from "dotenv";
dotenv.config();

import { readFile } from "fs/promises";
import { initBotInstance, BOT } from "./config/config.js";
import { registerMainHandler } from "./core/handlers/mainHandler.js";
import { autoExpireSessions } from "./core/sessionManager.js";

// 🔧 Init bot + handlers
initBotInstance();
registerMainHandler(BOT.INSTANCE);

// 🔁 Periodic zombie session killer
setInterval(() => {
  try {
    autoExpireSessions();
  } catch (err) {
    console.error("❌ [autoExpireSessions error]:", err.message);
  }
}, 10 * 60 * 1000); // every 10 min

// 🚀 Startup log + notify admin
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
      ).catch(e => {
        console.warn("⚠️ Failed to notify admin:", e.message);
      });
    }
  } catch (err) {
    console.error("❌ [Startup crash]:", err.message || err);
    await notifyCrash("startup", err);
    process.exit(1);
  }
})();

// 🛑 Global error catchers
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

// 📴 Graceful shutdown
["SIGINT", "SIGTERM", "SIGQUIT"].forEach(sig => {
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

console.log("✅ BALTICPHARMACYBOT — LIVE • LOCKED • BULLETPROOF");

/**
 * 🔔 Admin crash alert
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

// 🔄 Final discount sync (MUST BE LAST)
import "./config/discountSync.js"; // ✅ BULLETPROOF FINAL PLACEMENT
