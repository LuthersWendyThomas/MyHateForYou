// 📦 state/userState.js | FINAL IMMORTAL v1.0.0•GODMODE DIAMONDLOCK
// MAXIMUM SYNC • ZERO ERROR TOLERANCE • AUTO-EXPORT • ULTRA-OPTIMIZED

import fs from "fs";
import path from "path";

// ==============================
// 🚦 Session stores
// ==============================
export const userSessions   = {}; // { [userId]: sessionData }
export const userOrders     = {}; // { [userId]: orderCount }
export const userMessages   = {}; // { [userId]: [messageId, ...] }

// ==============================
// ⏱️ Timer stores
// ==============================
export const activeTimers   = {}; // delivery/cleanup timers
export const paymentTimers  = {}; // payment timeout timers

// ==============================
// 🔐 Security stores
// ==============================
export const failedAttempts = {}; // { [userId]: count }
export const bannedUntil    = {}; // { [userId]: timestamp }
export const antiSpam       = {}; // { [userId]: lastMessageTs }
export const antiFlood      = {}; // { [userId]: { count, startTs } }

// ==============================
// 👥 Active users registry
// ==============================
export const activeUsers = {
  list: new Set(),

  get count() {
    return this.list.size;
  },

  add(id) {
    const uid = sanitize(id);
    if (uid) this.list.add(uid);
  },

  remove(id) {
    const uid = sanitize(id);
    if (uid) this.list.delete(uid);
  },

  has(id) {
    return this.list.has(sanitize(id));
  },

  reset() {
    this.list.clear();
  }
};

// ==============================
// 🧼 Clears all timers for a user
// ==============================
export function clearTimersForUser(id) {
  const uid = sanitize(id);
  if (!uid) return;

  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    logAction("🕒 [clearTimersForUser]", "Cleared active timer", uid);
  }
  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    logAction("💳 [clearTimersForUser]", "Cleared payment timer", uid);
  }
}

// ==============================
// 🧽 Fully clear a user's session
// ==============================
export function clearUserSession(id) {
  const uid = sanitize(id);
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
    if (store[uid] !== undefined) delete store[uid];
  });

  activeUsers.remove(uid);
  logAction("🧼 [clearUserSession]", "Session cleared", uid);
}

// ==============================
// 🔄 Start a new session for a user
// ==============================
export function safeStartSession(id) {
  const uid = sanitize(id);
  if (!uid) return;

  userSessions[uid] = { step: 1, createdAt: Date.now() };
  activeUsers.add(uid);
  logAction("✅ [safeStartSession]", "New session started", uid);
}

// ==============================
// 🚨 Track failed attempts & auto-ban
// ==============================
export function trackFailedAttempts(id) {
  const uid = sanitize(id);
  if (!uid) return;

  failedAttempts[uid] = (failedAttempts[uid] || 0) + 1;
  logAction("⚠️ [trackFailedAttempts]", `Count=${failedAttempts[uid]}`, uid);

  if (failedAttempts[uid] >= 5) {
    bannedUntil[uid] = Date.now() + 15 * 60 * 1000; // 15 min
    logWarning("⛔ [trackFailedAttempts]", "Auto-banned for too many failures", uid);
  }
}

// ==============================
// ⏱️ Verify and sync session step
// ==============================
export function verifySessionStep(id) {
  const uid = sanitize(id);
  if (!uid) return 1;

  const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
  if (!isValidStep(session.step)) {
    logWarning("⚠️ [verifySessionStep]", `Resetting invalid step=${session.step}`, uid);
    session.step = 1;
  }
  return session.step;
}

// ==============================
// ✅ Valid steps definition
// ==============================
export function isValidStep(step) {
  // allow 1, 1.2, 2, 2.1, 2.2, … up through 9
  return Number.isFinite(step) && step >= 1 && step <= 9;
}

// ==============================
// 📤 Export current user stats to JSON
// ==============================
export function exportUserStats() {
  try {
    const now       = new Date();
    const ts        = now.toISOString().replace(/[-:.TZ]/g, "").slice(0,14);
    const filename  = `userStats-${ts}.json`;
    const dir       = path.join("logs");
    const filepath  = path.join(dir, filename);

    const data = {};
    for (const id of Object.keys(userSessions)) {
      const uid = sanitize(id);
      if (!uid) continue;
      data[uid] = {
        step:         userSessions[uid]?.step ?? null,
        city:         userSessions[uid]?.city ?? null,
        product:      userSessions[uid]?.product?.name ?? null,
        orders:       userOrders[uid] ?? 0,
        bannedUntil:  bannedUntil[uid] ?? null,
        trackedMsgs:  Array.isArray(userMessages[uid]) ? userMessages[uid].length : 0
      };
    }

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    logAction("📤 [exportUserStats]", `Exported to ${filepath}`);
    return filepath;
  } catch (err) {
    logError("❌ [exportUserStats error]", err);
    return null;
  }
}

// ==============================
// 🧩 Helpers
// ==============================

/** 🔒 Sanitize any ID into a usable string */
function sanitize(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

/** 📋 Log successful actions */
function logAction(action, message, uid = "") {
  console.log(`${new Date().toISOString()} ${action} → ${message}${uid ? ` (UID: ${uid})` : ""}`);
}

/** ⚠️ Log warnings */
function logWarning(action, message, uid = "") {
  console.warn(`${new Date().toISOString()} ${action} → ${message}${uid ? ` (UID: ${uid})` : ""}`);
}

/** 🚨 Log errors */
function logError(action, error, uid = "") {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (UID: ${uid})` : ""}`);
}
