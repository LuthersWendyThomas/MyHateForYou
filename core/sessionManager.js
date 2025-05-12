// 📦 core/sessionManager.js | FINAL IMMORTAL v999999999.∞+1 — TITANLOCK SYNC + ZOMBIE SLAYER + 24/7 BULLETPROOF

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

const lastSeenAt = {}; // ⏱️ Internal session activity clock

const STEP_TIMEOUT = 60 * 60 * 1000;             // 1h → zombie (mid-order, abandoned)
const DEFAULT_EXPIRE_THRESHOLD = 45 * 60 * 1000; // 45min → idle (home screen etc.)

/** ✅ Registers a user as active (pinged) */
export const markUserActive = (id) => {
  const uid = safeId(id);
  if (uid) {
    lastSeenAt[uid] = Date.now();
    logAction("✅ [markUserActive]", `User active → ${uid}`);
  }
};

/** ✅ Clears active delivery/session timer */
export const clearUserTimer = (id) => {
  const uid = safeId(id);
  if (uid && activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    logAction("🕒 [clearUserTimer]", `UI timer cleared → ${uid}`);
  }
};

/** ✅ Clears active payment confirmation timer */
export const clearPaymentTimer = (id) => {
  const uid = safeId(id);
  if (uid && paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    logAction("💳 [clearPaymentTimer]", `Payment timer cleared → ${uid}`);
  }
};

/** ✅ Total session reset: timers + state + all caches */
export const resetSession = (id) => {
  const uid = safeId(id);
  if (!uid) return;

  try {
    clearUserTimer(uid);
    clearPaymentTimer(uid);

    const stores = [
      userSessions,
      failedAttempts,
      antiFlood,
      antiSpam,
      bannedUntil,
      userMessages,
      userOrders,
      lastSeenAt
    ];

    for (const store of stores) {
      if (store?.[uid] !== undefined) delete store[uid];
    }

    activeUsers.remove(uid);
    logAction("🧼 [resetSession]", `Session reset → ${uid}`);
  } catch (err) {
    logError("❌ [resetSession error]", err, uid);
  }
};

/** ⏱️ Kills idle/zombie sessions (auto) */
export const autoExpireSessions = (threshold = DEFAULT_EXPIRE_THRESHOLD) => {
  const now = Date.now();
  const expired = [];

  for (const [id, last] of Object.entries(lastSeenAt)) {
    const uid = safeId(id);
    const session = userSessions[uid];
    const idle = now - last;

    const isZombie = session?.step >= 1 && idle > STEP_TIMEOUT;
    const isIdle = idle > threshold;

    if (isZombie || isIdle) {
      expired.push({ id: uid, zombie: isZombie });
    }
  }

  for (const { id, zombie } of expired) {
    resetSession(id);
    logAction("⏳ [autoExpireSessions]", `AUTO-EXPIRE (${zombie ? "ZOMBIE" : "IDLE"}) → ${id}`);
  }
};

/** 📊 Gets live active user count */
export const getActiveUsersCount = () => {
  const count = Object.keys(lastSeenAt).length;
  logAction("📊 [getActiveUsersCount]", `Active users: ${count}`);
  return count;
};

/** 🔥 Nukes all sessions from orbit (admin use) */
export const wipeAllSessions = () => {
  const ids = Object.keys(userSessions);
  for (const id of ids) resetSession(id);
  logAction("🔥 [wipeAllSessions]", `All sessions wiped → ${ids.length}`);
};

/** 🧽 Removes invalid payment timers (step drift) */
export const cleanStalePaymentTimers = () => {
  for (const id in paymentTimers) {
    const step = userSessions[id]?.step;
    if (step !== 8) {
      clearPaymentTimer(id);
      logAction("🧽 [cleanStalePaymentTimers]", `Stale payment timer cleared → ${id}`);
    }
  }
};

/** 🧪 Debug tool: list session summary to console */
export const printSessionSummary = () => {
  const now = Date.now();
  const sessions = Object.entries(userSessions);
  logAction("📊 [printSessionSummary]", `Active sessions: ${sessions.length}`);

  for (const [id, session] of sessions) {
    const last = lastSeenAt[id];
    const lastSeen = last ? `${Math.floor((now - last) / 1000)}s ago` : "unknown";
    console.log(`— ${id} | step=${session.step ?? "?"} | lastSeen=${lastSeen}`);
  }
};

// ————— HELPERS —————

/**
 * 🧠 Safely sanitizes user ID
 * @param {string|number} id - Input ID
 * @returns {string|null} - Sanitized ID or null
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
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (ID: ${uid})` : ""}`);
}
