// 🧹 cron/cleanOldLogs.js | FINAL v2.1 DIAMOND TANK CLEANER – AUTOLOG ROTATION

import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("./logs");
const MAX_AGE_DAYS = 3;
const LOOP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * ⏱️ Skaičiuoja dienų senumą nuo timestamp
 */
function daysOld(timestamp) {
  return (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
}

/**
 * 🧹 Trina senus log failus
 */
function cleanLogs() {
  try {
    const now = new Date().toLocaleString("en-GB");
    console.log(`🧹 Log cleanup started — ${now}`);

    if (!fs.existsSync(LOG_DIR)) {
      console.warn("📁 Logs directory not found. Skipping.");
      return;
    }

    const files = fs.readdirSync(LOG_DIR);
    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(LOG_DIR, file);
      if (!file.endsWith(".log")) continue; // Triname tik .log failus

      try {
        const stats = fs.statSync(filePath);
        if (daysOld(stats.mtimeMs) > MAX_AGE_DAYS) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted: ${file}`);
          deleted++;
        }
      } catch (err) {
        console.error(`❌ Error processing ${file}:`, err.message);
      }
    }

    console.log(`✅ Cleanup complete — ${deleted} log files deleted.\n`);
  } catch (err) {
    console.error("❌ [cleanLogs error]:", err.message || err);
  }
}

// 🕒 Paleidžiam iškart
cleanLogs();

// 🔁 Kartojam kas 24h
setInterval(cleanLogs, LOOP_INTERVAL_MS);
