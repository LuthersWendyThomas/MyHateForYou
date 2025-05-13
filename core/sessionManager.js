// 📦 core/sessionManager.js | IMMORTAL FINAL v1.1.0•999999X•SYNC•GODMODE•SKYLOCK
// TITANLOCK+PROJECT-SYNC • AUTO-EXPIRE • ZOMBIE SLAYER • 24/7 BULLETPROOF

import {
  activeTimers,
  paymentTimers,
  userSessions,
  failedAttempts,
  antiFlood,
  antiSpam,
  bannedUntil,
  userMessages,
  activeUsers
} from "../state/userState.js";

const lastSeenAt = new Map();

// ⏱ Timeout configs
const STEP_TIMEOUT_MS = 60 * 60_000;   // 1h = zombie
const IDLE_TIMEOUT_MS = 45 * 60_000;   // 45m = idle

/** ✅ Mark user as active + timestamp */
export function markUserActive(id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  lastSeenAt.set(uid, Date.now());
  activeUsers.add(uid);
  logAction("✅ [markUserActive]", "User marked active", uid);
}

/** ⏱ Clear session timeout */
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

/** 🔄 Fully wipe session (but keep order history) */
export function resetSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  try {
    clearUserTimer(uid);
    clearPaymentTimer(uid);

    [ userSessions, failedAttempts, antiFlood, antiSpam, bannedUntil, userMessages ]
      .forEach(store => { if (uid in store) delete store[uid]; });

    lastSeenAt.delete(uid);
    if (activeUsers.remove) activeUsers.remove(uid);
    else activeUsers.delete(uid);

    logAction("🧼 [resetSession]", "Session reset complete", uid);
  } catch (err) {
    logError("❌ [resetSession error]", err, uid);
  }
}

/** ⏳ Auto-expire stale/zombie sessions */
export function autoExpireSessions(threshold = IDLE_TIMEOUT_MS) {
  const now = Date.now();
  for (const [uid, last] of lastSeenAt.entries()) {
    try {
      const session  = userSessions[uid];
      const idleTime = now - last;
      const zombie   = session?.step >= 1 && idleTime > STEP_TIMEOUT_MS;
      const idle     = idleTime > threshold;

      if (zombie || idle) {
        resetSession(uid);
        logAction("⏳ [autoExpireSessions]", `Expired (${zombie ? "ZOMBIE" : "IDLE"})`, uid);
      }
    } catch (err) {
      logError("❌ [autoExpireSessions error]", err, uid);
    }
  }
}

/** 📊 Get live active count */
export function getActiveUsersCount() {
  const count = activeUsers.count || activeUsers.size || 0;
  logAction("📊 [getActiveUsersCount]", `=${count}`);
  return count;
}

/** 🔥 Wipe all user sessions (admin only!) */
export function wipeAllSessions() {
  try {
    for (const uid of Object.keys(userSessions)) {
      resetSession(uid);
    }
    logAction("🔥 [wipeAllSessions]", "All sessions reset");
  } catch (err) {
    logError("❌ [wipeAllSessions error]", err);
  }
}

/** 🧽 Cleanup payment timers not tied to active payments */
export function cleanStalePaymentTimers() {
  for (const uid in paymentTimers) {
    try {
      const step = userSessions[uid]?.step;
      if (step !== 8 && step !== 9) {
        clearPaymentTimer(uid);
        logAction("🧽 [cleanStalePaymentTimers]", "Stale timer cleared", uid);
      }
    } catch (err) {
      logError("❌ [cleanStalePaymentTimers error]", err, uid);
    }
  }
}

/** 🧪 Debug log of live sessions */
export function printSessionSummary() {
  const now = Date.now();
  const entries = Object.entries(userSessions);
  logAction("📊 [printSessionSummary]", `Count=${entries.length}`);
  for (const [uid, sess] of entries) {
    const seen = lastSeenAt.get(uid);
    const ago  = seen ? `${Math.floor((now - seen) / 1000)}s ago` : "unknown";
    console.log(`• ${uid} | Step: ${sess?.step ?? "?"} | LastSeen: ${ago}`);
  }
}

// ——— Helpers ———

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logAction(label, msg, uid = "") {
  console.log(`${new Date().toISOString()} ${label} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}

function logError(label, err, uid = "") {
  const msg = err?.message || err;
  console.error(`${new Date().toISOString()} ${label} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}
