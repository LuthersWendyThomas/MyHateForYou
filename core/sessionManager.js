// 📦 core/sessionManager.js | IMMORTAL FINAL v1.1.1•999999X•ULTRASYNC•GODMODE•SKYLOCK
// TITANLOCK+PROJECT-SYNC • AUTO-EXPIRE • FULL SESSION RESET • 24/7 BULLETPROOF

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

import { clearTimers, clearUserMessages, resetUser } from "./stateManager.js";

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

/** ⏱ Clear session timer */
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

/** 🔄 Legacy partial reset */
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

/** 🔥 FULL RESET — deletes session + messages + payment + timers + FSM data */
export async function fullResetUserState(uid) {
  uid = sanitizeId(uid);
  if (!uid) return;
  try {
    await clearTimers(uid);
    await clearUserMessages(uid);
    await resetUser(uid);

    [ userOrders, userMessages, paymentTimers ].forEach(store => delete store[uid]);

    if (userSessions[uid]) {
      Object.keys(userSessions[uid]).forEach(k => (userSessions[uid][k] = null));
      delete userSessions[uid];
    }

    lastSeenAt.delete(uid);
    if (typeof activeUsers.remove === "function") {
      activeUsers.remove(uid);
    } else {
      activeUsers.delete(uid);
    }

    logAction("🔥 [fullResetUserState]", "Total wipe complete", uid);
  } catch (err) {
    logError("❌ [fullResetUserState error]", err, uid);
  }
}

/** ⏳ Expire idle or zombie sessions */
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

/** 📊 Get live count */
export function getActiveUsersCount() {
  const count = activeUsers.count || activeUsers.size || 0;
  logAction("📊 [getActiveUsersCount]", `=${count}`);
  return count;
}

/** 🧽 Wipe all sessions (admin) */
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

/** 💳 Remove orphaned timers */
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

/** 🧪 Print session debug */
export function printSessionSummary() {
  const now = Date.now();
  const entries = Object.entries(userSessions);
  logAction("📊 [printSessionSummary]", `Count=${entries.length}`);
  for (const [uid, sess] of entries) {
    const seen = lastSeenAt.get(uid);
    const ago = seen ? `${Math.floor((now - seen) / 1000)}s ago` : "unknown";
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
