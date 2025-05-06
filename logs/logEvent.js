// 🧾 logs/logEvent.js | BalticPharma V2 — FINAL v2025.6 EVENT CORE LOGGER EDITION

import fs from "fs";
import path from "path";

// ==============================
// 📁 Logs katalogas
// ==============================

const logsDir = path.resolve("./logs");
const logFile = path.join(logsDir, "events.log");

/**
 * ✅ Užtikrina, kad logs katalogas egzistuoja
 */
function ensureLogsFolder() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

/**
 * ✅ Užregistruoja įvykį logs/events.log faile su data
 * @param {string} type - Įvykio tipas (pvz: ORDER, PAYMENT, ERROR)
 * @param {string} message - Žinutė
 */
export function logEvent(type, message) {
  try {
    ensureLogsFolder();
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${type}] ${message}\n`;
    fs.appendFileSync(logFile, line);
  } catch (e) {
    console.error("❌ Nepavyko įrašyti log įrašo:", e);
  }
}
