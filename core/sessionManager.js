// 📦 core/sessionManager.js | FINAL IMMORTAL v999999999.∞+ULTIMATE
// TITANLOCK SYNCED • ZOMBIE SLAYER • AUTO-EXPIRE • 24/7 BULLETPROOF • ULTRA-OPTIMIZED

import {
  activeTimers,
  paymentTimers,
  userSessions,
  failedAttempts,
  antiFlood,
  antiSpam,
  bannedUntil,
  userMessages,
  userOrders,
  activeUsers
} from "../state/userState.js";

const lastSeenAt = {}; // ⏱️ Tracks user activity timestamps

const STEP_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour for zombie sessions
const IDLE_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes for idle sessions

/** ✅ Registers a user as active */
export const markUserActive = (id) => {
  const uid = safeId(id);
  if (uid) {
    lastSeenAt[uid] = Date.now();
    logAction("✅ [markUserActive]", `User marked active → ${uid}`);
  }
};

/** ✅ Clears a user's active session timer */
export const clearUserTimer = (id) => {
  const uid = safeId(id);
  if (uid && activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    logAction("🕒 [clearUserTimer]", `Session timer cleared → ${uid}`);
  }
};

/** ✅ Clears a user's payment timer */
export const clearPaymentTimer = (id) => {
  const uid = safeId(id);
  if (uid && paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    logAction("💳 [clearPaymentTimer]", `Payment timer cleared → ${uid}`);
  }
};

/** ✅ Resets a user's entire session: timers, state, and activity */
export const resetSession = (id) => {
  const uid = safeId(id);
  if (!uid) return;

  try {
    clearUserTimer(uid);
    clearPaymentTimer(uid);

    const stateStores = [
      userSessions,
      failedAttempts,
      antiFlood,
      antiSpam,
      bannedUntil,
      userMessages,
      userOrders,
      lastSeenAt
    ];

    for (const store of stateStores) {
      if (store?.[uid] !== undefined) delete store[uid];
    }

    activeUsers.remove(uid);
    logAction("🧼 [resetSession]", `Session fully reset → ${uid}`);
  } catch (err) {
    logError("❌ [resetSession error]", err, uid);
  }
};

/** ⏳ Automatically expires idle or zombie sessions */
export const autoExpireSessions = (threshold = IDLE_TIMEOUT_MS) => {
  const now = Date.now();
  const expiredSessions = [];

  for (const [id, lastActivity] of Object.entries(lastSeenAt)) {
    const uid = safeId(id);
    const session = userSessions[uid];
    const idleTime = now - lastActivity;

    const isZombie = session?.step >= 1 && idleTime > STEP_TIMEOUT_MS;
    const isIdle = idleTime > threshold;

    if (isZombie || isIdle) {
      expiredSessions.push({ id: uid, isZombie });
    }
  }

  for (const { id, isZombie } of expiredSessions) {
    resetSession(id);
    logAction("⏳ [autoExpireSessions]", `Session auto-expired (${isZombie ? "ZOMBIE" : "IDLE"}) → ${id}`);
  }
};

/** 📊 Returns the current count of active users */
export const getActiveUsersCount = () => {
  const count = activeUsers.count;
  logAction("📊 [getActiveUsersCount]", `Active users: ${count}`);
  return count;
};

/** 🔥 Fully clears all user sessions (admin use) */
export const wipeAllSessions = () => {
  const allUserIds = Object.keys(userSessions);
  for (const id of allUserIds) resetSession(id);

  logAction("🔥 [wipeAllSessions]", `All sessions wiped → ${allUserIds.length}`);
};

/** 🧽 Cleans up invalid payment timers */
export const cleanStalePaymentTimers = () => {
  for (const id in paymentTimers) {
    const step = userSessions[id]?.step;
    if (step !== 8) {
      clearPaymentTimer(id);
      logAction("🧽 [cleanStalePaymentTimers]", `Stale payment timer cleared → ${id}`);
    }
  }
};

/** 🧪 Debugging tool: Prints a summary of all active sessions */
export const printSessionSummary = () => {
  const now = Date.now();
  const sessions = Object.entries(userSessions);

  logAction("📊 [printSessionSummary]", `Active sessions: ${sessions.length}`);

  for (const [id, session] of sessions) {
    const lastActive = lastSeenAt[id];
    const lastSeen = lastActive ? `${Math.floor((now - lastActive) / 1000)}s ago` : "unknown";

    console.log(`— ${id} | Step: ${session.step ?? "?"} | Last Seen: ${lastSeen}`);
  }
};

// ————— HELPERS —————

/**
 * ✅ Safely sanitizes a user ID input
 * @param {string|number} id - Input ID
 * @returns {string|null} - Sanitized ID or null if invalid
 */
function safeId(id) {
  const str = String(id ?? "").trim();
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
 * ⚠️ Logs errors
 * @param {string} action - Action description
 * @param {Error|string} error - Error object or message
 * @param {string} [uid] - User ID (optional)
 */
function logError(action, error, uid = null) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (UID: ${uid})` : ""}`);
}
