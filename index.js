// 📦 index.js | BalticPharmacyBot — FINAL IMMORTAL v9999999999999999.∞+GODMODE DIAMONDLOCK TITAN-FUSED
// DEPLOY LOCKED • BULLETPROOF • 24/7 AUTO-RESILIENT • ADMIN-SAFE

import dotenv from "dotenv";
dotenv.config();

import { readFile } from "fs/promises";
import { initBotInstance, BOT } from "./config/config.js";
import { registerMainHandler } from "./core/handlers/mainHandler.js";
import { autoExpireSessions } from "./core/sessionManager.js";
import "./config/discountSync.js"; // ⛓️ Always last — pulls latest active discounts

/**
 * 🔔 Notifies admin on crash (uncaught errors or rejections)
 */
async function notifyCrash(source, err) {
  if (!BOT.ADMIN_ID || !BOT.INSTANCE?.sendMessage) return;
  const now = new Date().toLocaleString("en-GB");
  const msg = `❗️ *Bot crashed during ${source}!*\n\n💥 Error: \`${err?.message || err}\`\n🕒 ${now}`;
  try {
    await BOT.INSTANCE.sendMessage(BOT.ADMIN_ID, msg, { parse_mode: "Markdown" });
  } catch {
    console.warn("⚠️ Admin crash notification failed.");
  }
}

// 🔧 Init bot + register handlers
initBotInstance();
registerMainHandler(BOT.INSTANCE);

// 🔁 Periodic session cleanup (every 10 minutes)
setInterval(() => {
  try {
    autoExpireSessions();
  } catch (err) {
    console.error("❌ [autoExpireSessions]", err.message);
  }
}, 10 * 60 * 1000);

// 🚀 Startup self-check + log + admin ping
(async () => {
  try {
    if (!BOT.INSTANCE?.getMe) throw new Error("BOT.INSTANCE not initialized");

    const me = await BOT.INSTANCE.getMe();
    const version = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"))?.version || "1.0.0";
    const now = new Date().toLocaleString("en-GB");

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║ ✅ BALTICPHARMACYBOT LIVE — FINAL IMMORTAL GODMODE TITANLOCK ║
╚══════════════════════════════════════════════════════════════╝
🆙 Version: v${version}
🕒 Started: ${now}
👤 Logged in as: @${me.username} (${me.first_name})
`.trim());

    if (BOT.ADMIN_ID && !isNaN(BOT.ADMIN_ID)) {
      await BOT.INSTANCE.sendMessage(
        BOT.ADMIN_ID,
        `✅ *BalticPharmacyBot v${version}* successfully launched!\n🕒 *${now}*`,
        { parse_mode: "Markdown" }
      ).catch(e => console.warn("⚠️ Admin startup ping failed:", e.message));
    }
  } catch (err) {
    console.error("❌ [Startup crash]:", err.message || err);
    await notifyCrash("startup", err);
    process.exit(1);
  }
})();

// 💥 Global crash catchers
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

// 🛑 Graceful SIG shutdowns
["SIGINT", "SIGTERM", "SIGQUIT"].forEach(sig => {
  process.on(sig, async () => {
    console.log(`\n🛑 Signal received (${sig}) → stopping bot...`);
    try {
      await BOT.INSTANCE?.stopPolling();
      console.log("✅ Bot stopped gracefully.");
    } catch (err) {
      console.warn("⚠️ Graceful shutdown error:", err.message);
    }
    process.exit(0);
  });
});

console.log("✅ BALTICPHARMACYBOT READY • LOCKED • BULLETPROOF • ∞");
