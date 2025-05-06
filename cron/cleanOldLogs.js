// 🧹 cron/cleanOldLogs.js | BalticPharma V2 — FINAL v2.0 DIAMOND POLISHED AUTOLOOP

import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("./logs");
const MAX_AGE_DAYS = 3;
const LOOP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Calculates how old (in days) a file is based on its timestamp
 */
function daysOld(timestamp) {
  const now = Date.now();
  return (now - timestamp) / (1000 * 60 * 60 * 24);
}

/**
 * Deletes all log files older than MAX_AGE_DAYS
 */
function cleanLogs() {
  try {
    console.log(`🧹 Starting log cleanup: ${new Date().toLocaleString("en-GB")}`);

    if (!fs.existsSync(LOG_DIR)) {
      console.warn("📁 Logs directory does not exist. Skipping.");
      return;
    }

    const files = fs.readdirSync(LOG_DIR);
    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(LOG_DIR, file);

      try {
        const stats = fs.statSync(filePath);
        const age = daysOld(stats.mtimeMs);

        if (age > MAX_AGE_DAYS) {
          fs.unlinkSync(filePath);
          deleted++;
          console.log(`🗑️ Deleted old log file: ${file}`);
        }
      } catch (err) {
        console.error(`❌ Error deleting "${file}":`, err.message);
      }
    }

    console.log(`✅ Log cleanup finished. Deleted: ${deleted} files.\n`);
  } catch (err) {
    console.error("❌ [cleanLogs error]:", err.message || err);
  }
}

// — Run immediately on start
cleanLogs();

// — Repeat every 24 hours
setInterval(() => {
  cleanLogs();
}, LOOP_INTERVAL_MS);
