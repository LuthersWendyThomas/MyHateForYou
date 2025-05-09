// 📦 index.js | BalticPharma V3 — FINAL IMMORTAL v3.0 DEPLOY-TITANLOCK™ EDITION

import dotenv from "dotenv";
dotenv.config();

import { readFile } from "fs/promises";
import { initBotInstance, BOT } from "./config/config.js";
import { registerMainHandler } from "./core/handlers/mainHandler.js";
import { autoExpireSessions } from "./core/sessionManager.js";

// 🧠 Initialize bot instance + handlers
initBotInstance();
registerMainHandler(BOT.INSTANCE);

// 🔁 Periodic session expiration every 10 minutes
setInterval(() => {
  try {
    autoExpireSessions();
  } catch (err) {
    console.error("❌ [autoExpireSessions error]:", err.message || err);
  }
}, 10 * 60 * 1000);

// 🚀 On successful startup
(async () => {
  try {
    if (!BOT.INSTANCE?.getMe) throw new Error("BOT.INSTANCE is not available or broken.");

    const me = await BOT.INSTANCE.getMe();
    const version = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"))?.version || "1.0.0";
    const now = new Date().toLocaleString("en-GB");

    console.log(`
╔════════════════════════════════════════════════╗
║ ✅ BALTICPHARMACYBOT IS LIVE — IMMORTAL v3.0   ║
╚════════════════════════════════════════════════╝
🆙 Version: v${version}
🕒 Started: ${now}
👤 Logged in as: @${me.username} (${me.first_name})
`.trim());

    if (BOT.ADMIN_ID && !isNaN(BOT.ADMIN_ID)) {
      await BOT.INSTANCE.sendMessage(
        BOT.ADMIN_ID,
        `✅ *BalticPharmacyBot v${version}* successfully launched.\n🕒 *${now}*`,
        { parse_mode: "Markdown" }
      ).catch((e) => {
        console.warn("⚠️ Failed to notify admin:", e.message);
      });
    }

  } catch (err) {
    console.error("❌ Startup failure:", err.message || err);
    await notifyCrash("launch", err);
    process.exit(1);
  }
})();

// 🔥 Fatal error handlers
process.on("uncaughtException", async (err) => {
  console.error("❌ [UNCAUGHT EXCEPTION]:", err);
  await notifyCrash("uncaughtException", err);
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  console.error("❌ [UNHANDLED PROMISE]:", reason);
  await notifyCrash("unhandledRejection", reason);
  process.exit(1);
});

// 🛑 Graceful shutdown on SIGINT, SIGTERM, SIGQUIT
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((sig) => {
  process.on(sig, async () => {
    console.log(`\n🛑 Received ${sig}, stopping bot...`);
    try {
      await BOT.INSTANCE?.stopPolling();
      console.log("✅ Bot stopped cleanly.");
    } catch (e) {
      console.warn("⚠️ Error during shutdown:", e.message);
    }
    process.exit(0);
  });
});

// ✅ Final ready signal
console.log("✅ BALTICPHARMACYBOT — BULLETPROOF • LOCKED • LIVE");


// 🔔 Sends critical crash info to admin
async function notifyCrash(type, err) {
  if (!BOT.ADMIN_ID || !BOT.INSTANCE?.sendMessage) return;

  const msg = `❗️ *Bot crashed during ${type}!*\n\n💥 Error: \`${err?.message || err}\`\n🕒 ${new Date().toLocaleString("en-GB")}`;

  try {
    await BOT.INSTANCE.sendMessage(BOT.ADMIN_ID, msg, { parse_mode: "Markdown" });
  } catch {
    console.warn("⚠️ Failed to send crash alert to admin.");
  }
}
