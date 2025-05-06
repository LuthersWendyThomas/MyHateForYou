// 🧹 cron/cleanOldLogs.js | BalticPharma V2 — FINAL v2.0 DIAMOND POLISHED AUTOLOOP

import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("./logs");
const MAX_AGE_DAYS = 3;
const LOOP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 valandos

/**
 * Apskaičiuoja kiek dienų senumo yra failas
 */
function daysOld(timestamp) {
  const now = Date.now();
  return (now - timestamp) / (1000 * 60 * 60 * 24);
}

/**
 * Valo visus logus, senesnius nei MAX_AGE_DAYS
 */
function cleanLogs() {
  try {
    console.log(`🧹 Pradedamas log'ų valymas: ${new Date().toLocaleString("lt-LT")}`);

    if (!fs.existsSync(LOG_DIR)) {
      console.warn("📁 Logs katalogas neegzistuoja. Praleidžiama.");
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
          console.log(`🗑️ Ištrintas senas log failas: ${file}`);
        }
      } catch (err) {
        console.error(`❌ Klaida trinant "${file}":`, err.message);
      }
    }

    console.log(`✅ Log'ų valymas baigtas. Ištrinta: ${deleted} failų.\n`);
  } catch (err) {
    console.error("❌ [cleanLogs klaida]:", err.message || err);
  }
}

// — Paleidžiam iškart start'e
cleanLogs();

// — Kartojam kas 24 valandas
setInterval(() => {
  cleanLogs();
}, LOOP_INTERVAL_MS);
