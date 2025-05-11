// 📦 cron/cleanOldLogs.js | FINAL IMMORTAL v9999999.1 — ULTRABULLETPROOF CRON SYNCED

import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("logs");
const MAX_AGE_DAYS = 3;
const LOOP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * 📆 Calculates how many days ago a timestamp was
 */
function daysOld(timestamp) {
  return (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
}

/**
 * 🧹 Deletes all `.log` files older than MAX_AGE_DAYS
 */
function cleanLogs() {
  const now = new Date().toLocaleString("en-GB");
  console.log(`\n🧹 [cleanOldLogs] Started at ${now}`);

  if (!fs.existsSync(LOG_DIR)) {
    console.warn("⚠️ [cleanOldLogs] Log directory does not exist. Skipping.");
    return;
  }

  let deleted = 0;

  try {
    const files = fs.readdirSync(LOG_DIR);

    for (const file of files) {
      if (!file.endsWith(".log")) continue;

      const fullPath = path.join(LOG_DIR, file);

      try {
        const { mtimeMs } = fs.statSync(fullPath);
        const age = daysOld(mtimeMs);

        if (age > MAX_AGE_DAYS) {
          fs.unlinkSync(fullPath);
          console.log(`🗑️ Deleted: ${file} (age: ${age.toFixed(1)}d)`);
          deleted++;
        }
      } catch (err) {
        console.error(`❌ [cleanOldLogs] Error processing "${file}": ${err.message}`);
      }
    }

    console.log(`✅ Cleanup complete. Deleted ${deleted} log file(s).\n`);
  } catch (err) {
    console.error("❌ [cleanOldLogs] Fatal error:", err.message || err);
  }
}

// 🕒 Run immediately
cleanLogs();

// 🔁 Schedule next cleanup every 24h
setInterval(cleanLogs, LOOP_INTERVAL_MS);
