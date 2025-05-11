// 🧾 logs/logEvent.js | FINAL IMMORTAL v9999999 — BULLETPROOF EVENT LOGGER SYNCED

import fs from "fs";
import path from "path";

// ==============================
// 📁 Logs catalog
// ==============================

const logsDir = path.resolve("./logs");
const logFile = path.join(logsDir, "events.log");

/**
 * ✅ Ensures that the logs directory exists
 */
function ensureLogsFolder() {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (err) {
    console.error("❌ [logEvent] Failed to ensure logs directory:", err.message);
  }
}

/**
 * ✅ Records an event in logs/events.log with UTC timestamp
 * @param {string} type — Event type (e.g. ORDER, PAYMENT, ERROR)
 * @param {string} message — Message to log
 */
export function logEvent(type, message) {
  try {
    ensureLogsFolder();

    const timestamp = new Date().toISOString();
    const sanitizedType = (type || "UNKNOWN").toUpperCase().slice(0, 20);
    const cleanMessage = String(message || "").trim().replace(/\s+/g, " ");

    const line = `[${timestamp}] [${sanitizedType}] ${cleanMessage}\n`;
    fs.appendFileSync(logFile, line, "utf8");

    if (process.env.DEBUG_LOGS === "true") {
      console.log(`🧾 [logEvent] ${sanitizedType}: ${cleanMessage}`);
    }
  } catch (err) {
    console.error("❌ [logEvent] Failed to write log entry:", err.message);
  }
}
