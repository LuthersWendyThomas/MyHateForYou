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
    console.error("❌ [autoExpireSessions klaida]:", err.message);
  }
}, 10 * 60 * 1000);

// — Paleidimo informacija + žinutė adminui
(async () => {
  try {
    if (!BOT.INSTANCE?.getMe) throw new Error("BOT.INSTANCE nenurodytas arba netinkamas.");

    const me = await BOT.INSTANCE.getMe();
    const version = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"))?.version || "1.0.0";
    const now = new Date().toLocaleString("lt-LT");

    console.log(`
╔═══════════════════════════════╗
║  ✅ BALTICVAISTINE_BOT paleistas  ║
╚═══════════════════════════════╝
v${version} — ${now}
Prisijungta kaip: @${me.username} (${me.first_name})
    `);

    if (BOT.ADMIN_ID && !isNaN(BOT.ADMIN_ID)) {
      await BOT.INSTANCE.sendMessage(
        BOT.ADMIN_ID,
        `✅ *BALTICVAISTINE_BOT v${version}* sėkmingai paleistas!\n🕒 Laikas: *${now}*`,
        { parse_mode: "Markdown" }
      ).catch((e) => {
        console.warn("⚠️ Nepavyko nusiųsti admin žinutės:", e.message);
      });
    }

  } catch (err) {
    console.error("❌ Paleidimo klaida:", err.message || err);

    if (BOT.ADMIN_ID && !isNaN(BOT.ADMIN_ID)) {
      try {
        await BOT.INSTANCE?.sendMessage(
          BOT.ADMIN_ID,
          `❗️ *Botas nulūžo per paleidimą!*\n\n🕒 Klaidos laikas: *${new Date().toLocaleString("lt-LT")}*`,
          { parse_mode: "Markdown" }
        );
      } catch {}
    }

    process.exit(1);
  }
})();

// — Gaudo fatalius nulūžimus
process.on("uncaughtException", async (err) => {
  console.error("❌ Fatal klaida (exception):", err);
  if (BOT.ADMIN_ID && !isNaN(BOT.ADMIN_ID)) {
    try {
      await BOT.INSTANCE?.sendMessage(
        BOT.ADMIN_ID,
        `❗️ *BOTAS NULŪŽO!*\n\n💥 Klaida: \`${err.message || "Nežinoma"}\``,
        { parse_mode: "Markdown" }
      );
    } catch {}
  }
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  console.error("❌ Neapdorota klaida (promise):", reason);
  if (BOT.ADMIN_ID && !isNaN(BOT.ADMIN_ID)) {
    try {
      await BOT.INSTANCE?.sendMessage(
        BOT.ADMIN_ID,
        `❗️ *BOTAS NULŪŽO!*\n\n💥 Neapdorota klaida: \`${reason?.message || reason}\``,
        { parse_mode: "Markdown" }
      );
    } catch {}
  }
  process.exit(1);
});

// — Gaudo shutdown signalus (tyli mirtis)
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((sig) => {
  process.on(sig, async () => {
    console.log(`\n🛑 Gauta ${sig}, stabdom botą...`);
    try {
      await BOT.INSTANCE?.stopPolling();
      console.log("✅ Botas sėkmingai sustabdytas.");
    } catch (e) {
      console.warn("⚠️ Klaida stabdant botą:", e.message);
    }
    process.exit(0);
  });
});

console.log("✅ BALTICVAISTINE_BOT — READY & BULLETPROOF RUNNING");
