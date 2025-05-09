// 📦 index.js | BalticPharma V3 — FINAL IMMORTAL v3.0.9999999 DEPLOY-TITANLOCK™

import dotenv from "dotenv";
dotenv.config();

import { readFile } from "fs/promises";
import { initBotInstance, BOT } from "./config/config.js";
import { registerMainHandler } from "./core/handlers/mainHandler.js";
import { autoExpireSessions } from "./core/sessionManager.js";

// 🧠 Init instance + register handlers
initBotInstance();
registerMainHandler(BOT.INSTANCE);

// 🔁 Kill inactive sessions every 10min
setInterval(() => {
  try {
    autoExpireSessions();
  } catch (err) {
    console.error("❌ [autoExpireSessions error]:", err.message);
  }
}, 10 * 60 * 1000);

// 🚀 Startup: validate, log, notify admin
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

// ❗ Crash safety: unhandled exceptions
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

// 🛑 Graceful shutdown
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((sig) => {
  process.on(sig, async () => {
    console.log(`\n🛑 Signal received (${sig}) → stopping bot...`);
    try {
      await BOT.INSTANCE?.stopPolling();
      console.log("✅ Bot stopped cleanly.");
    } catch (err) {
      console.warn("⚠️ Error during shutdown:", err.message);
    }
    process.exit(0);
  });
});

// 🧠 DEV MODE: final ready signal
console.log("✅ BALTICPHARMACYBOT — LIVE • LOCKED • BULLETPROOF");

/**
 * 🔔 Sends critical error/crash info to admin
 */
async function notifyCrash(type, err) {
  if (!BOT.ADMIN_ID || !BOT.INSTANCE?.sendMessage) return;

  const msg = `❗️ *Bot crashed during ${type}!*\n\n💥 Error: \`${err?.message || err}\`\n🕒 ${new Date().toLocaleString("en-GB")}`;

  try {
    await BOT.INSTANCE.sendMessage(BOT.ADMIN_ID, msg, { parse_mode: "Markdown" });
  } catch {
    console.warn("⚠️ Failed to send crash alert to admin.");
  }
}
