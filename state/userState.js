// 📦 state/userState.js | FINAL IMMORTAL BULLETPROOF LOCKED v999999999.9999

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
// 🔧 Utility helpers — SYNC-GODMODE
// ==============================

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
  console.log(`🧼 Session fully cleared → ${uid}`);
}

export function safeStartSession(id) {
  const uid = safeString(id);
  if (!uid) return;

  userSessions[uid] = {
    step: 1,
    createdAt: Date.now()
  };

  activeUsers.add(uid);
  console.log(`✅ Session started → ${uid}`);
}

export function trackFailedAttempts(id) {
  const uid = safeString(id);
  if (!uid) return;

  failedAttempts[uid] = (failedAttempts[uid] || 0) + 1;

  if (failedAttempts[uid] >= 5) {
    bannedUntil[uid] = Date.now() + 15 * 60 * 1000;
    console.warn(`⛔️ ${uid} autobanned (too many failed inputs)`);
  }
}

export function clearTimersForUser(id) {
  const uid = safeString(id);
  if (!uid) return;

  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    console.log(`🕒 Active timer cleared → ${uid}`);
  }

  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    console.log(`💳 Payment timer cleared → ${uid}`);
  }
}

// ==============================
// 🧠 Session Validation & Sync
// ==============================

/**
 * ✅ Validates and synchronizes user step
 * Auto-resets to 1 if invalid or undefined
 */
export function verifySessionStep(id) {
  const uid = safeString(id);
  if (!uid) return;

  const session = userSessions[uid] || {};
  if (!isValidStep(session.step)) {
    console.warn(`⚠️ Invalid step "${session.step}" for user ${uid}. Resetting to step 1.`);
    session.step = 1;
  }

  userSessions[uid] = session;
  return session.step;
}

/**
 * ✅ Checks if a step is valid
 */
export function isValidStep(step) {
  return Number.isInteger(step) && step >= 1 && step <= 9;
}

// ==============================
// 📤 EXPORT: userStats → logs/userStats-TIMESTAMP.json
// ==============================

export function exportUserStats() {
  try {
    const now = new Date();
    const ts = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const fileName = `userStats-${ts}.json`;
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

    console.log(`📤 [exportUserStats] Exported to: ${filePath}`);
    return filePath;
  } catch (err) {
    console.error("❌ [exportUserStats error]:", err.message);
    return null;
  }
}

/**
 * ✅ Converts any ID to a safe string
 */
function safeString(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}
