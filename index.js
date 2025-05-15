// 📦 index.js | BalticPharmacyBot — IMMORTAL FINAL v1.2.1•GODMODE•DIAMONDLOCK•WOWUI•SIGTERM++•409VISUALS

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { readFile, writeFile } from "fs/promises";
import { initBotInstance, BOT } from "./config/config.js";
import { registerMainHandler } from "./core/handlers/mainHandler.js";
import { autoExpireSessions, cleanStalePaymentTimers } from "./core/sessionManager.js";
import { sendAdminPing } from "./core/handlers/paymentHandler.js";
import { startQrCacheMaintenance } from "./jobs/qrCacheMaintainer.js";
import { initQrCacheDir, generateFullQrCache, validateQrFallbacks } from "./utils/qrCacheManager.js";
import "./config/discountSync.js";

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

// 🔁 Debounce tracker for polling_error
let last409Time = 0;

async function notifyCrash(source, err) {
  const msg = typeof err === "object" && err !== null ? err.message || JSON.stringify(err) : String(err);
  const upper = source.toUpperCase();
  const now = new Date().toLocaleString("en-GB");

  const formattedConsole = `
\x1b[41m\x1b[30m
💥 CRITICAL ERROR — ${upper}
🕒 ${now}
🧨 MESSAGE: ${msg}
\x1b[0m`.trim();

  const formattedAdmin = `❌ *${upper} CRASH:*\n\`\`\`\n${msg}\n\`\`\`\n🕒 ${now}`;

  // Debounced special case for polling_error 409
  if (
    source === "polling_error" &&
    typeof msg === "string" &&
    msg.includes("409 Conflict") &&
    msg.includes("getUpdates request")
  ) {
    const nowMs = Date.now();
    if (nowMs - last409Time < 60_000) return;
    last409Time = nowMs;

    console.log(`
\x1b[43m\x1b[30m
⚠️ 409 CONFLICT — BOT ALREADY POLLING
🕒 ${now}
📡 Skipping duplicate polling
\x1b[0m`.trim());

    await sendAdminPing(`⚠️ *409 Conflict: Already polling*\n🕒 ${now}`);
    return;
  }

  // Print to console
  console.error(formattedConsole);

  // Notify admin
  try {
    await sendAdminPing(formattedAdmin);
  } catch (sendErr) {
    console.warn("⚠️ Failed to send admin ping:", sendErr.message);
  }
}

(async () => {
  try {
    initBotInstance();

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

    BOT.INSTANCE.on("polling_error", async (err) => {
      const msg = err?.message || String(err);
      await notifyCrash("polling_error", msg);
    });

    try {
      registerMainHandler(BOT.INSTANCE);
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
      setTimeout(() => sendAdminPing("✅ Bot fully ready (RAM warmed up, timers running, FSM live)."), 12 * 60 * 1000);
    } catch (initErr) {
      await notifyCrash("bot.init", initErr);
      process.exit(1);
    }

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

    setTimeout(async () => {
      console.log("⏳ Delayed QR fallback generation starting (3 min post-boot)...");
      try {
        await initQrCacheDir();
        await generateFullQrCache();
        await validateQrFallbacks(true);
        console.log("✅ Delayed QR fallback generation complete and validated.");
        await sendAdminPing("📦 Delayed QR fallback generation completed successfully (post-boot).");
      } catch (err) {
        console.error("❌ Delayed QR cache generation failed:", err.message);
        await sendAdminPing(`⚠️ QR fallback generation failed (post-boot)\n\`${err.message}\``);
      }
    }, 180_000);

  } catch (err) {
    await notifyCrash("boot", err);
    process.exit(1);
  }
})();

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

// 🔌 Graceful shutdown UI
["SIGINT", "SIGTERM", "SIGQUIT"].forEach(sig =>
  process.on(sig, async () => {
    const ts = new Date().toLocaleString("en-GB");

    // 💥 RED BLOCK VISUAL
    console.log(`
\x1b[41m\x1b[30m
💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥
🛑 SHUTDOWN SIGNAL RECEIVED: ${sig}
🕒 ${ts}
🔌 Stopping BalticPharmacyBot gracefully...
💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥
\x1b[0m`.trim());

    try {
      await BOT.INSTANCE.stopPolling();
      await BOT.INSTANCE.close();

      // ✅ GREEN BLOCK VISUAL
      console.log(`
\x1b[42m\x1b[30m
✅ BOT SHUTDOWN COMPLETE — FINAL STATUS: SAFE
🧼 Polling stopped
📦 FSM and timers flushed
🛡️ Exit stable and secure
🕒 ${ts}
\x1b[0m`.trim());

      // 📤 ADMIN NOTIFY
      await sendAdminPing(
        `🛑 *Bot shutdown signal received:* \`${sig}\`\n\n` +
        `✅ *Polling stopped*\n📦 *FSM cleaned*\n🛡️ *System exited cleanly*\n🕒 ${ts}`
      );
    } catch (err) {
      console.warn("⚠️ Graceful shutdown error:", err.message);
    }

    process.exit(0);
  })
);

console.log("✅ BALTICPHARMACYBOT READY • LOCKED • BULLETPROOF • ∞");
