// 📦 core/sessionManager.js | IMMORTAL FINAL v1.0.0•GODMODE DIAMONDLOCK
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

const lastSeenAt = new Map();

// ⏱️ Timeouts
const STEP_TIMEOUT_MS = 60 * 60 * 1000;   // 1 hour for “zombie” sessions
const IDLE_TIMEOUT_MS = 45 * 60 * 1000;   // 45 minutes for idle sessions

/** ✅ Mark a user as active right now */
export function markUserActive(id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  lastSeenAt.set(uid, Date.now());
  logAction("✅ [markUserActive]", "User marked active", uid);
}

/** 🕒 Clear any existing session timer for a user */
export function clearUserTimer(id) {
  const uid = sanitizeId(id);
  if (uid && activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    logAction("🕒 [clearUserTimer]", "Session timer cleared", uid);
  }
}

/** 💳 Clear any existing payment timer for a user */
export function clearPaymentTimer(id) {
  const uid = sanitizeId(id);
  if (uid && paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    logAction("💳 [clearPaymentTimer]", "Payment timer cleared", uid);
  }
}

/** 🔄 Fully reset a user: timers, sessions, messages, orders, bans, etc. */
export function resetSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  try {
    clearUserTimer(uid);
    clearPaymentTimer(uid);

    // Wipe all state stores
    [
      userSessions,
      failedAttempts,
      antiFlood,
      antiSpam,
      bannedUntil,
      userMessages,
      userOrders
    ].forEach(store => {
      if (store?.[uid] !== undefined) delete store[uid];
    });

    // Remove last-seen and activeUsers entry
    lastSeenAt.delete(uid);
    if (activeUsers.delete) activeUsers.delete(uid);
    else if (activeUsers.remove) activeUsers.remove(uid);

    logAction("🧼 [resetSession]", "Session fully reset", uid);
  } catch (err) {
    logError("❌ [resetSession error]", err, uid);
  }
}

/** ⏳ Expire idle or “zombie” sessions automatically */
export function autoExpireSessions(threshold = IDLE_TIMEOUT_MS) {
  const now = Date.now();
  for (const [uid, last] of lastSeenAt.entries()) {
    try {
      const session = userSessions[uid];
      const idleTime = now - last;
      const isZombie = session?.step >= 1 && idleTime > STEP_TIMEOUT_MS;
      const isIdle   = idleTime > threshold;

      if (isZombie || isIdle) {
        resetSession(uid);
        logAction(
          "⏳ [autoExpireSessions]",
          `Session auto-expired (${isZombie ? "ZOMBIE" : "IDLE"})`,
          uid
        );
      }
    } catch (err) {
      logError("❌ [autoExpireSessions error]", err, uid);
    }
  }
}

/** 📊 Get the current count of active users */
export function getActiveUsersCount() {
  const count = activeUsers.size ?? activeUsers.count ?? 0;
  logAction("📊 [getActiveUsersCount]", `Active users: ${count}`);
  return count;
}

/** 🔥 Wipe all sessions at once (admin tool) */
export function wipeAllSessions() {
  try {
    const uids = Object.keys(userSessions);
    uids.forEach(uid => resetSession(uid));
    logAction("🔥 [wipeAllSessions]", `All sessions wiped (${uids.length})`);
  } catch (err) {
    logError("❌ [wipeAllSessions error]", err);
  }
}

/** 🧽 Clear any payment timers that shouldn’t be running */
export function cleanStalePaymentTimers() {
  for (const uid in paymentTimers) {
    try {
      if (userSessions[uid]?.step !== 8) {
        clearPaymentTimer(uid);
        logAction("🧽 [cleanStalePaymentTimers]", "Stale payment timer cleared", uid);
      }
    } catch (err) {
      logError("❌ [cleanStalePaymentTimers error]", err, uid);
    }
  }
}

/** 🧪 Print a debug summary of all active sessions */
export function printSessionSummary() {
  const now = Date.now();
  const sessions = Object.entries(userSessions);
  logAction("📊 [printSessionSummary]", `Active sessions: ${sessions.length}`);
  sessions.forEach(([uid, session]) => {
    const last = lastSeenAt.get(uid);
    const ago = last ? `${Math.floor((now - last) / 1000)}s ago` : "unknown";
    console.log(`— ${uid} | Step: ${session.step ?? "?"} | Last Seen: ${ago}`);
  });
}

// ————— HELPERS —————

/** 🔒 Sanitize any incoming ID */
function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

/** 📋 Log a successful action */
function logAction(action, message, uid = "") {
  console.log(
    `${new Date().toISOString()} ${action} → ${message}${uid ? ` (UID: ${uid})` : ""}`
  );
}

/** 🚨 Log an error */
function logError(action, error, uid = "") {
  const msg = error?.message || error;
  console.error(
    `${new Date().toISOString()} ${action} → ${msg}${uid ? ` (UID: ${uid})` : ""}`
  );
}
