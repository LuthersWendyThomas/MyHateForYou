// 📦 state/userState.js | FINAL IMMORTAL BULLETPROOF LOCKED v999999999.∞+DIAMOND
// MAXIMUM SYNC • ZERO ERROR TOLERANCE • AUTO-EXPORT • ULTRA-OPTIMIZED

import fs from "fs";
import path from "path";

// ==============================
// 🔁 User sessions and progress tracking
// ==============================

export const userSessions = {};     // { [userId]: { step, city, product, ... } }
export const userOrders = {};       // { [userId]: number }
export const userMessages = {};     // { [userId]: [messageId, ...] }

// ==============================
// 🛡️ Security and time-based state
// ==============================

export const activeTimers = {};     // Cleanup timers (delivery end)
export const paymentTimers = {};    // Payment timers
export const failedAttempts = {};   // Input violation count
export const bannedUntil = {};      // { userId: timestampMs }
export const antiSpam = {};         // { userId: lastActionTimestamp }
export const antiFlood = {};        // { userId: { count, start } }

// ==============================
// 📊 Real-time session activity monitor
// ==============================

export const activeUsers = {
  list: new Set(),

  get count() {
    return this.list.size;
  },

  add(id) {
    const uid = safeString(id);
    if (uid) this.list.add(uid);
  },

  remove(id) {
    const uid = safeString(id);
    if (uid) this.list.delete(uid);
  },

  has(id) {
    return this.list.has(safeString(id));
  },

  reset() {
    this.list.clear();
  }
};

// ==============================
// 🔧 Utility helpers — DIAMOND SYNC
// ==============================

/**
 * ✅ Clears a user's session and all related data
 * @param {string|number} id - User ID
 */
export function clearUserSession(id) {
  const uid = safeString(id);
  if (!uid) return;

  clearTimersForUser(uid);

  [
    userSessions,
    userOrders,
    userMessages,
    failedAttempts,
    bannedUntil,
    antiSpam,
    antiFlood
  ].forEach(store => {
    if (store?.[uid] !== undefined) delete store[uid];
  });

  activeUsers.remove(uid);
  logAction("🧼 [clearUserSession]", `Fully cleared session for → ${uid}`);
}

/**
 * ✅ Safely starts a new session for a user
 * @param {string|number} id - User ID
 */
export function safeStartSession(id) {
  const uid = safeString(id);
  if (!uid) return;

  userSessions[uid] = {
    step: 1,
    createdAt: Date.now()
  };

  activeUsers.add(uid);
  logAction("✅ [safeStartSession]", `New session started → ${uid}`);
}

/**
 * ✅ Tracks failed input attempts and auto-bans after threshold
 * @param {string|number} id - User ID
 */
export function trackFailedAttempts(id) {
  const uid = safeString(id);
  if (!uid) return;

  failedAttempts[uid] = (failedAttempts[uid] || 0) + 1;

  if (failedAttempts[uid] >= 5) {
    bannedUntil[uid] = Date.now() + 15 * 60 * 1000; // 15-minute ban
    logWarning("⛔️ [trackFailedAttempts]", `Auto-banned user → ${uid}`);
  }
}

/**
 * ✅ Clears all active timers for a user
 * @param {string|number} id - User ID
 */
export function clearTimersForUser(id) {
  const uid = safeString(id);
  if (!uid) return;

  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    logAction("🕒 [clearTimersForUser]", `Active timer cleared → ${uid}`);
  }

  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    logAction("💳 [clearTimersForUser]", `Payment timer cleared → ${uid}`);
  }
}

// ==============================
// 🧠 Session Validation & Sync
// ==============================

/**
 * ✅ Validates and synchronizes a user's session step
 * Auto-resets to step 1 if invalid or undefined
 * @param {string|number} id - User ID
 * @returns {number} - Current or reset step
 */
export function verifySessionStep(id) {
  const uid = safeString(id);
  if (!uid) return 1;

  const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
  if (!isValidStep(session.step)) {
    logWarning("⚠️ [verifySessionStep]", `Invalid step "${session.step}" for user → ${uid}`);
    session.step = 1;
  }

  return session.step;
}

/**
 * ✅ Checks if a step is valid
 * @param {number} step - Workflow step
 * @returns {boolean} - True if step is valid
 */
export function isValidStep(step) {
  return Number.isInteger(step) && step >= 1 && step <= 9;
}

// ==============================
// 📤 EXPORT: userStats → logs/userStats-TIMESTAMP.json
// ==============================

/**
 * ✅ Exports all user stats to a JSON file
 * @returns {string|null} - File path if successful, null otherwise
 */
export function exportUserStats() {
  try {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const fileName = `userStats-${timestamp}.json`;
    const filePath = path.join("logs", fileName);

    const exportData = {};

    for (const id of Object.keys(userSessions)) {
      const uid = safeString(id);
      if (!uid) continue;

      exportData[uid] = {
        step: userSessions[uid]?.step ?? null,
        city: userSessions[uid]?.city ?? null,
        product: userSessions[uid]?.product?.name ?? null,
        orders: userOrders[uid] ?? 0,
        bannedUntil: bannedUntil[uid] ?? null,
        lastMsgCount: Array.isArray(userMessages[uid]) ? userMessages[uid].length : 0
      };
    }

    if (!fs.existsSync("logs")) fs.mkdirSync("logs", { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

    logAction("📤 [exportUserStats]", `Exported user stats to → ${filePath}`);
    return filePath;
  } catch (err) {
    logError("❌ [exportUserStats error]", err);
    return null;
  }
}

// ==============================
// 🧩 Helper Functions
// ==============================

/**
 * ✅ Converts any ID into a safe string
 * @param {string|number} id - Input ID
 * @returns {string|null} - Sanitized ID or null if invalid
 */
function safeString(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}

/**
 * 📝 Logs successful actions
 * @param {string} action - Action description
 * @param {string} message - Additional details
 */
function logAction(action, message) {
  console.log(`${new Date().toISOString()} ${action} → ${message}`);
}

/**
 * ⚠️ Logs warnings
 * @param {string} action - Action description
 * @param {string} message - Additional details
 */
function logWarning(action, message) {
  console.warn(`${new Date().toISOString()} ${action} → ${message}`);
}

/**
 * ⚠️ Logs errors
 * @param {string} action - Action description
 * @param {Error|string} error - Error object or message
 */
function logError(action, error) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}`);
}
