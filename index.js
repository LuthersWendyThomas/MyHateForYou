// 📦 index.js | BalticPharma V2 — FINAL IMMORTAL v1.6 DEPLOY-LOCK DIAMOND EDITION

import dotenv from "dotenv";
dotenv.config();

import { readFile } from "fs/promises";
import { initBotInstance, BOT } from "./config/config.js";
import { registerMainHandler } from "./core/handlers/mainHandler.js";
import { autoExpireSessions } from "./core/sessionManager.js";

// — Inicializuojam bot instanciją
initBotInstance();

// — Registruojam pagrindinį handlerį
registerMainHandler(BOT.INSTANCE);

// — Periodinis session cleanup kas 10 min.
setInterval(() => {
  try {
    autoExpireSessions();
  } catch (err) {
    console.error("❌ [autoExpireSessions error]:", err.message);
  }
}, 10 * 60 * 1000);

// — Paleidimo informacija + žinutė adminui
(async () => {
  try {
    if (!BOT.INSTANCE?.getMe) throw new Error("BOT.INSTANCE unknown or wrong.");

    const me = await BOT.INSTANCE.getMe();
    const version = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"))?.version || "1.0.0";
    const now = new Date().toLocaleString("en-GB");

    console.log(`
╔═══════════════════════════════╗
║ ✅ BALTICPHARMACY HAD STARTED ║
╚═══════════════════════════════╝
v${version} — ${now}
Prisijungta kaip: @${me.username} (${me.first_name})
    `);

    if (BOT.ADMIN_ID && !isNaN(BOT.ADMIN_ID)) {
      await BOT.INSTANCE.sendMessage(
        BOT.ADMIN_ID,
        `✅ *BALTICPHARMACYBOT v${version}* successfully launched!\n🕒 Time: *${now}*`,
        { parse_mode: "Markdown" }
      ).catch((e) => {
        console.warn("⚠️ Failed to send admin message:", e.message);
      });
    }

  } catch (err) {
    console.error("❌ Start error:", err.message || err);

    if (BOT.ADMIN_ID && !isNaN(BOT.ADMIN_ID)) {
      try {
        await BOT.INSTANCE?.sendMessage(
          BOT.ADMIN_ID,
          `❗️ *Bot broke during launch!*\n\n🕒 Error Time: *${new Date().toLocaleString("lt-LT")}*`,
          { parse_mode: "Markdown" }
        );
      } catch {}
    }

    process.exit(1);
  }
})();

// — Gaudo fatalius nulūžimus
process.on("uncaughtException", async (err) => {
  console.error("❌ Fatal error (exception):", err);
  if (BOT.ADMIN_ID && !isNaN(BOT.ADMIN_ID)) {
    try {
      await BOT.INSTANCE?.sendMessage(
        BOT.ADMIN_ID,
        `❗️ *BOT IS BROKEN DOWN!*\n\n💥 Error: \`${err.message || "Unknown"}\``,
        { parse_mode: "Markdown" }
      );
    } catch {}
  }
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  console.error("❌ Unhandled error (promise):", reason);
  if (BOT.ADMIN_ID && !isNaN(BOT.ADMIN_ID)) {
    try {
      await BOT.INSTANCE?.sendMessage(
        BOT.ADMIN_ID,
        `❗️ *BOT IS BROKEN DOWN!*\n\n💥 Unhandled error: \`${reason?.message || reason}\``,
        { parse_mode: "Markdown" }
      );
    } catch {}
  }
  process.exit(1);
});

// — Gaudo shutdown signalus (tyli mirtis)
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((sig) => {
  process.on(sig, async () => {
    console.log(`\n🛑 Received ${sig}, stopping the bot...`);
    try {
      await BOT.INSTANCE?.stopPolling();
      console.log("✅ Bot successfully stopped.");
    } catch (e) {
      console.warn("⚠️ Error while stopping the bot:", e.message);
    }
    process.exit(0);
  });
});

console.log("✅ BALTICPHARMACYBOT — READY & BULLETPROOF RUNNING");
