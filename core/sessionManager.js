// 📦 core/sessionManager.js | IMMORTAL FINAL v999999999 — TITAN SYNC + ZOMBIE KILLER EDITION

import {
  activeTimers,
  paymentTimers,
  userSessions,
  failedAttempts,
  antiFlood,
  antiSpam,
  bannedUntil,
  userMessages,
  userOrders
} from "../state/userState.js";

const lastSeenAt = {}; // ⏱️ Track last user activity time

const STEP_TIMEOUT = 60 * 60 * 1000;             // 1h — zombie protection
const DEFAULT_EXPIRE_THRESHOLD = 45 * 60 * 1000; // 45min — idle timeout

/**
 * ✅ On any user interaction, mark them active
 */
export const markUserActive = (id) => {
  const uid = String(id || "").trim();
  if (uid) lastSeenAt[uid] = Date.now();
};

/**
 * ✅ Clears UI/delivery timer
 */
export const clearUserTimer = (id) => {
  const uid = String(id || "").trim();
  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    console.log(`🕒 UI timer cleared → ${uid}`);
  }
};

/**
 * ✅ Clears payment-specific timer
 */
export const clearPaymentTimer = (id) => {
  const uid = String(id || "").trim();
  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    console.log(`💳 Payment timer cleared → ${uid}`);
  }
};

/**
 * ✅ Wipes everything linked to this user
 */
export const resetSession = (id) => {
  const uid = String(id || "").trim();
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
      if (uid in store) {
        delete store[uid];
      }
    }

    console.log(`🧼 Session reset → ${uid}`);
  } catch (err) {
    console.error("❌ [resetSession error]:", err.message);
  }
};

/**
 * ⏳ Checks for expired/zombie sessions
 */
export const autoExpireSessions = (threshold = DEFAULT_EXPIRE_THRESHOLD) => {
  const now = Date.now();
  const expired = [];

  for (const [id, last] of Object.entries(lastSeenAt)) {
    const session = userSessions[id];
    const idle = now - last;

    const isIdle = idle > threshold;
    const isZombie = session?.step >= 1 && idle > STEP_TIMEOUT;

    if (isIdle || isZombie) {
      expired.push(id);
    }
  }

  for (const id of expired) {
    resetSession(id);
    console.log(`⏳ AUTO-EXPIRE (${userSessions[id]?.step >= 1 ? "ZOMBIE" : "IDLE"}) → ${id}`);
  }
};

/**
 * 📊 Returns active user count
 */
export const getActiveUsersCount = () => {
  return Object.keys(userSessions).length;
};

/**
 * 🔥 Developer use — reset all
 */
export const wipeAllSessions = () => {
  const ids = Object.keys(userSessions);
  for (const id of ids) resetSession(id);
  console.log(`🔥 wipeAllSessions → ${ids.length} wiped`);
};

/**
 * 🧽 Clean orphan payment timers (not in payment step anymore)
 */
export const cleanStalePaymentTimers = () => {
  for (const id in paymentTimers) {
    if (userSessions[id]?.step !== 8) {
      clearPaymentTimer(id);
      console.log(`🧽 Stale payment timer cleared → ${id}`);
    }
  }
};

/**
 * 🧪 Debug — overview of all user sessions
 */
export const printSessionSummary = () => {
  const now = Date.now();
  const sessions = Object.entries(userSessions);
  console.log(`📊 Active sessions: ${sessions.length}`);

  for (const [id, session] of sessions) {
    const lastSeen = lastSeenAt[id]
      ? `${Math.floor((now - lastSeenAt[id]) / 1000)}s ago`
      : "unknown";
    console.log(`— ${id} | step=${session.step ?? "?"} | lastSeen=${lastSeen}`);
  }
};
