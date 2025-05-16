// 📦 core/sessionManager.js | IMMORTAL FINAL v2.1.0•999999999999999X•DIAMONDLOCK•SYNC•ULTRA-SAFE
// FULL SESSION LIFECYCLE • QR/PAYMENT FSM CLEANING • AUTO-ZOMBIE KILL • ZERO MEMORY LEAKS

import {
  userSessions,
  userOrders,
  userMessages,
  userWallets,
  failedAttempts,
  antiFlood,
  antiSpam,
  bannedUntil,
  paymentTimers,
  activeTimers,
  activeUsers
} from "../state/userState.js";

import { clearTimersForUser } from "../state/timers.js";
import { clearUserMessages, resetUser } from "../state/stateManager.js";

const lastSeenAt = new Map();

const STEP_TIMEOUT_MS = 60 * 60_000;
const IDLE_TIMEOUT_MS = 45 * 60_000;

/**
 * ✅ Mark user as active
 */
export function markUserActive(id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  lastSeenAt.set(uid, Date.now());
  activeUsers.add(uid);
  logAction("✅ [markUserActive]", "User marked active", uid);
}

/**
 * 🔄 Partial reset — cancel current session cleanly
 */
export function resetSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    clearTimersForUser(uid);

    [
      userSessions,
      failedAttempts,
      antiFlood,
      antiSpam,
      bannedUntil,
      userMessages
    ].forEach(store => {
      if (uid in store) delete store[uid];
    });

    lastSeenAt.delete(uid);
    activeUsers.remove?.(uid);

    logAction("🧼 [resetSession]", "Session reset complete", uid);
  } catch (err) {
    logError("❌ [resetSession error]", err, uid);
  }
}

/**
 * 🔥 Full state purge (used after cancel/payment timeout)
 */
export async function fullResetUserState(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    await clearTimersForUser(uid);
    await clearUserMessages(uid);
    await resetUser(uid);

    delete userOrders[uid];
    delete paymentTimers[uid];
    delete userSessions[uid];

    lastSeenAt.delete(uid);
    activeUsers.remove?.(uid);

    logAction("🔥 [fullResetUserState]", "Full state reset complete", uid);
  } catch (err) {
    logError("❌ [fullResetUserState error]", err, uid);
  }
}

/**
 * ⏳ Expire idle or zombie sessions
 */
export function autoExpireSessions(threshold = IDLE_TIMEOUT_MS) {
  const now = Date.now();

  for (const [uid, lastSeen] of lastSeenAt.entries()) {
    try {
      const session = userSessions[uid];
      const isIdle = now - lastSeen > threshold;
      const isZombie = session?.step >= 1 && now - lastSeen > STEP_TIMEOUT_MS;

      if (isIdle || isZombie) {
        resetSession(uid);
        logAction("⏳ [autoExpireSessions]", `Expired (${isZombie ? "ZOMBIE" : "IDLE"})`, uid);
      }
    } catch (err) {
      logError("❌ [autoExpireSessions error]", err, uid);
    }
  }
}

/**
 * 📊 Count active users
 */
export function getActiveUsersCount() {
  const count = activeUsers.count || activeUsers.size || 0;
  logAction("📊 [getActiveUsersCount]", `=${count}`);
  return count;
}

/**
 * 🔥 Admin: nuke all sessions globally
 */
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

/**
 * 🧼 Cleanup payment timers not linked to step 8 or 9
 */
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

/**
 * 🧪 Debug: print summary of all live sessions
 */
export function printSessionSummary() {
  const now = Date.now();
  const entries = Object.entries(userSessions);
  logAction("📊 [printSessionSummary]", `Sessions=${entries.length}`);

  for (const [uid, session] of entries) {
    const lastSeen = lastSeenAt.get(uid);
    const ago = lastSeen ? `${Math.floor((now - lastSeen) / 1000)}s ago` : "unknown";
    console.log(`• ${uid} | Step: ${session?.step ?? "?"} | LastSeen: ${ago}`);
  }
}

/**
 * 🟢 Safe session start (used for fresh FSM init)
 */
export function safeStartSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  const now = Date.now();
  userSessions[uid] = {
    step: 1,
    createdAt: now,
    lastActionTimestamp: now // 💠 Debounce apsaugai
  };

  activeUsers.add(uid);
  logAction("✅ [safeStartSession]", "Session started", uid);
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
