// 📦 core/sessionManager.js | IMMORTAL FINAL v2.0.0•99999999999X•DIAMONDLOCK•SYNCED
// 100% WALLET + TIMER + QR + FSM SESSION LIFECYCLE SUPPORT • FULL RESET ENGINE

import {
  activeTimers,
  paymentTimers,
  userSessions,
  failedAttempts,
  antiFlood,
  antiSpam,
  bannedUntil,
  userMessages,
  activeUsers,
  userOrders
} from "../state/userState.js";

import { clearTimersForUser } from "../state/timers.js";
import { clearUserMessages, resetUser } from "../state/stateManager.js";

const lastSeenAt = new Map();

// ⏱ Timeout configs
const STEP_TIMEOUT_MS = 60 * 60_000;
const IDLE_TIMEOUT_MS = 45 * 60_000;

/** ✅ Mark user as active + timestamp */
export function markUserActive(id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  lastSeenAt.set(uid, Date.now());
  activeUsers.add(uid);
  logAction("✅ [markUserActive]", "User marked active", uid);
}

/** 🔄 Partial session reset — for minimal failures/back navigation */
export function resetSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  try {
    clearTimersForUser(uid);

    [userSessions, failedAttempts, antiFlood, antiSpam, bannedUntil, userMessages]
      .forEach(store => { if (uid in store) delete store[uid]; });

    lastSeenAt.delete(uid);
    activeUsers.remove?.(uid);
    logAction("🧼 [resetSession]", "Session reset complete", uid);
  } catch (err) {
    logError("❌ [resetSession error]", err, uid);
  }
}

/** 🔥 Full state wipe for user — all systems */
export async function fullResetUserState(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    await clearTimersForUser(uid);
    await clearUserMessages(uid);
    await resetUser(uid);

    [userOrders, paymentTimers].forEach(store => delete store[uid]);
    if (userSessions[uid]) delete userSessions[uid];
    lastSeenAt.delete(uid);
    activeUsers.remove?.(uid);
    logAction("🔥 [fullResetUserState]", "Full state reset complete", uid);
  } catch (err) {
    logError("❌ [fullResetUserState error]", err, uid);
  }
}

/** ⏳ Expire zombie or idle sessions */
export function autoExpireSessions(threshold = IDLE_TIMEOUT_MS) {
  const now = Date.now();
  for (const [uid, last] of lastSeenAt.entries()) {
    try {
      const session = userSessions[uid];
      const idle = now - last > threshold;
      const zombie = session?.step >= 1 && now - last > STEP_TIMEOUT_MS;

      if (idle || zombie) {
        resetSession(uid);
        logAction("⏳ [autoExpireSessions]", `Expired (${zombie ? "ZOMBIE" : "IDLE"})`, uid);
      }
    } catch (err) {
      logError("❌ [autoExpireSessions error]", err, uid);
    }
  }
}

/** 📊 Count active users */
export function getActiveUsersCount() {
  const count = activeUsers.count || activeUsers.size || 0;
  logAction("📊 [getActiveUsersCount]", `=${count}`);
  return count;
}

/** 🧽 Admin: wipe all sessions */
export function wipeAllSessions() {
  try {
    for (const uid of Object.keys(userSessions)) {
      resetSession(uid);
    }
    logAction("🔥 [wipeAllSessions]", "All sessions wiped");
  } catch (err) {
    logError("❌ [wipeAllSessions error]", err);
  }
}

/** 💳 Cleanup orphaned payment timers */
export function cleanStalePaymentTimers() {
  for (const uid in paymentTimers) {
    try {
      const step = userSessions[uid]?.step;
      if (step !== 8 && step !== 9) {
        clearTimeout(paymentTimers[uid]);
        delete paymentTimers[uid];
        logAction("🧽 [cleanStalePaymentTimers]", "Stale payment timer removed", uid);
      }
    } catch (err) {
      logError("❌ [cleanStalePaymentTimers error]", err, uid);
    }
  }
}

/** 🧪 Debug: print all active sessions */
export function printSessionSummary() {
  const now = Date.now();
  const entries = Object.entries(userSessions);
  logAction("📊 [printSessionSummary]", `Sessions=${entries.length}`);
  for (const [uid, sess] of entries) {
    const seen = lastSeenAt.get(uid);
    const ago = seen ? `${Math.floor((now - seen) / 1000)}s ago` : "unknown";
    console.log(`• ${uid} | Step: ${sess?.step ?? "?"} | LastSeen: ${ago}`);
  }
}

// ——— Internal Helpers ———

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
