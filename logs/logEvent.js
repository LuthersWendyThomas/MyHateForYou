// 🧾 logs/logEvent.js | BalticPharma V2 — FINAL v2025.6 EVENT CORE LOGGER EDITION

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
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

/**
 * ✅ Records the event in the logs/events.log file with the date
 * @param {string} type - Event type (pvz: ORDER, PAYMENT, ERROR)
 * @param {string} message - Message
 */
export function logEvent(type, message) {
  try {
    ensureLogsFolder();
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${type}] ${message}\n`;
    fs.appendFileSync(logFile, line);
  } catch (e) {
    console.error("❌ Failed to write log entry:", e);
  }
}
