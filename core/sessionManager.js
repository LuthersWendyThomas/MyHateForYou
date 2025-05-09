// 🧠 core/sessionManager.js | FINAL IMMORTAL LOCKED v2025.9 — TITAN SYNC+ MIRROR POLISH

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

const lastSeenAt = {}; // ⏱️ Tracks last activity time per user

const STEP_TIMEOUT = 60 * 60 * 1000;            // 1h — zombie protection
const DEFAULT_EXPIRE_THRESHOLD = 45 * 60 * 1000; // 45min — idle session kill

/**
 * ✅ Called on every user action to mark activity
 */
export const markUserActive = (id) => {
  if (!id) return;
  const uid = String(id);
  lastSeenAt[uid] = Date.now();
};

/**
 * ✅ Clears user delivery timer
 */
export const clearUserTimer = (id) => {
  const uid = String(id);
  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    console.log(`🕒 UI timer cleared → ${uid}`);
  }
};

/**
 * ✅ Clears user payment timer
 */
export const clearPaymentTimer = (id) => {
  const uid = String(id);
  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    console.log(`💳 Payment timer cleared → ${uid}`);
  }
};

/**
 * ✅ Fully clears user session, memory, timers, flags
 */
export const resetSession = (id) => {
  const uid = String(id);
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
      if (store?.[uid] !== undefined) {
        delete store[uid];
      }
    }

    console.log(`🧼 Session reset → ${uid}`);
  } catch (err) {
    console.error("❌ [resetSession error]:", err.message || err);
  }
};

/**
 * ⏳ Kills inactive or zombie sessions
 */
export const autoExpireSessions = (threshold = DEFAULT_EXPIRE_THRESHOLD) => {
  const now = Date.now();
  const expired = [];

  for (const [id, last] of Object.entries(lastSeenAt)) {
    const session = userSessions[id];
    const idleTime = now - last;

    const isIdle = idleTime > threshold;
    const isZombie = session?.step >= 1 && idleTime > STEP_TIMEOUT;

    if (isIdle || isZombie) {
      expired.push(id);
    }
  }

  for (const id of expired) {
    resetSession(id);
    console.log(`⏳ AUTO-EXPIRE → ${id}`);
  }
};

/**
 * ✅ Returns number of active user sessions
 */
export const getActiveUsersCount = () => {
  return Object.keys(userSessions).length;
};

/**
 * 🔥 Clears everything (use on deploy)
 */
export const wipeAllSessions = () => {
  const ids = Object.keys(userSessions);
  for (const id of ids) resetSession(id);
  console.log(`🔥 wipeAllSessions() → ${ids.length} sessions wiped`);
};

/**
 * 🧽 Cleans payment timers for users not in step 8
 */
export const cleanStalePaymentTimers = () => {
  for (const id in paymentTimers) {
    const step = userSessions[id]?.step;
    if (step !== 8) {
      clearPaymentTimer(id);
      console.log(`🧽 Stale payment timer cleared → ${id}`);
    }
  }
};

/**
 * 📊 Developer debug tool
 */
export const printSessionSummary = () => {
  const now = Date.now();
  const sessions = Object.entries(userSessions);

  console.log(`📊 Active sessions: ${sessions.length}`);

  for (const [id, session] of sessions) {
    const lastSeen = lastSeenAt[id]
      ? `${Math.floor((now - lastSeenAt[id]) / 1000)}s ago`
      : "unknown";
    console.log(`— ${id} | step=${session.step || "?"} | last=${lastSeen}`);
  }
};
