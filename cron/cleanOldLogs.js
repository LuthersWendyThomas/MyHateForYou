// 📦 cron/cleanOldLogs.js | FINAL IMMORTAL v9999999.0 — ULTRABULLETPROOF CLEANER

import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("./logs");
const MAX_AGE_DAYS = 3;
const LOOP_INTERVAL_MS = 24 * 60 * 60 * 1000; // kas 24h

/**
 * ⏱️ Paskaičiuoja, kiek dienų praėjo nuo timestamp
 */
function daysOld(timestamp) {
  return (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
}

/**
 * 🧹 Trina senus .log failus (vyresnius nei MAX_AGE_DAYS)
 */
function cleanLogs() {
  try {
    const now = new Date().toLocaleString("en-GB");
    console.log(`\n🧹 [cleanOldLogs] Log cleanup started — ${now}`);

    if (!fs.existsSync(LOG_DIR)) {
      console.warn("📁 [cleanOldLogs] 'logs/' folder not found — skipping cleanup.");
      return;
    }

    const files = fs.readdirSync(LOG_DIR);
    let deletedCount = 0;

    for (const file of files) {
      if (!file.endsWith(".log")) continue;

      const filePath = path.join(LOG_DIR, file);

      try {
        const stats = fs.statSync(filePath);
        const age = daysOld(stats.mtimeMs);

        if (age > MAX_AGE_DAYS) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted: ${file} (age: ${age.toFixed(1)}d)`);
          deletedCount++;
        }
      } catch (err) {
        console.error(`❌ [cleanOldLogs] Failed to process ${file}:`, err.message);
      }
    }

    console.log(`✅ [cleanOldLogs] Cleanup complete — ${deletedCount} file(s) deleted.\n`);
  } catch (err) {
    console.error("❌ [cleanOldLogs] Fatal error:", err.message || err);
  }
}

// 🕒 Paleidžiam iškart
cleanLogs();

// 🔁 Kartojam kas 24h
setInterval(cleanLogs, LOOP_INTERVAL_MS);
