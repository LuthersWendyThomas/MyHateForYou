// 📦 core/sessionManager.js | IMMORTAL FINAL v1.0.1•GODMODE DIAMONDLOCK
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
  // userOrders  ← preserve order history across sessions
  activeUsers
} from "../state/userState.js";

const lastSeenAt = new Map();

// ⏱️ Timeouts
const STEP_TIMEOUT_MS = 60 * 60_000;   // 1h zombie
const IDLE_TIMEOUT_MS = 45 * 60_000;   // 45m idle

/** ✅ Mark a user as active now */
export function markUserActive(id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  lastSeenAt.set(uid, Date.now());
  activeUsers.add(uid);
  logAction("✅ [markUserActive]", "User marked active", uid);
}

/** 🕒 Clear session timer */
export function clearUserTimer(id) {
  const uid = sanitizeId(id);
  if (uid && activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    logAction("🕒 [clearUserTimer]", "Session timer cleared", uid);
  }
}

/** 💳 Clear payment timer */
export function clearPaymentTimer(id) {
  const uid = sanitizeId(id);
  if (uid && paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    logAction("💳 [clearPaymentTimer]", "Payment timer cleared", uid);
  }
}

/** 🔄 Fully reset a user (preserve order history) */
export function resetSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  try {
    clearUserTimer(uid);
    clearPaymentTimer(uid);

    // wipe per-session stores (but keep userOrders)
    [ userSessions, failedAttempts, antiFlood, antiSpam, bannedUntil, userMessages ]
      .forEach(store => { if (store[uid] !== undefined) delete store[uid]; });

    lastSeenAt.delete(uid);
    activeUsers.remove(uid);

    logAction("🧼 [resetSession]", "Session fully reset", uid);
  } catch (err) {
    logError("❌ [resetSession error]", err, uid);
  }
}

/** ⏳ Expire idle or “zombie” sessions */
export function autoExpireSessions(threshold = IDLE_TIMEOUT_MS) {
  const now = Date.now();
  for (const [uid, lastTs] of lastSeenAt.entries()) {
    try {
      const session = userSessions[uid];
      const idleTime = now - lastTs;
      const isZombie = session?.step >= 1 && idleTime > STEP_TIMEOUT_MS;
      const isIdle   = idleTime > threshold;

      if (isZombie || isIdle) {
        resetSession(uid);
        logAction(
          "⏳ [autoExpireSessions]",
          `Auto-expired (${isZombie ? "ZOMBIE" : "IDLE"})`,
          uid
        );
      }
    } catch (err) {
      logError("❌ [autoExpireSessions error]", err, uid);
    }
  }
}

/** 📊 Current active users count */
export function getActiveUsersCount() {
  const count = activeUsers.count;
  logAction("📊 [getActiveUsersCount]", `=${count}`);
  return count;
}

/** 🔥 Wipe all sessions (admin only) */
export function wipeAllSessions() {
  try {
    Object.keys(userSessions).forEach(uid => resetSession(uid));
    logAction("🔥 [wipeAllSessions]", `All sessions wiped`);
  } catch (err) {
    logError("❌ [wipeAllSessions error]", err);
  }
}

/** 🧽 Clear stale payment timers */
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

/** 🧪 Debug print of active sessions */
export function printSessionSummary() {
  const now = Date.now();
  const sessions = Object.entries(userSessions);
  logAction("📊 [printSessionSummary]", `Count=${sessions.length}`);
  sessions.forEach(([uid, session]) => {
    const last = lastSeenAt.get(uid);
    const ago = last ? `${Math.floor((now - last)/1000)}s ago` : "unknown";
    console.log(`— ${uid} | Step: ${session.step ?? "?"} | LastSeen: ${ago}`);
  });
}

// ————— HELPERS —————

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logAction(action, msg, uid = "") {
  console.log(`${new Date().toISOString()} ${action} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}

function logError(action, err, uid = "") {
  const m = err?.message || err;
  console.error(`${new Date().toISOString()} ${action} → ${m}${uid ? ` (UID: ${uid})` : ""}`);
}
