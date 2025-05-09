// 🧠 core/sessionManager.js | FINAL BULLETPROOF v2.0 — TITANLOCK SYNC+ EDITION

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

// 🕓 Activity timestamps
const lastSeenAt = {};

// ⏰ Session aging configuration
const STEP_TIMEOUT = 60 * 60 * 1000;            // 1h — zombie session kill
const DEFAULT_EXPIRE_THRESHOLD = 45 * 60 * 1000; // 45min — idle session kill

/**
 * ✅ Called on each user input to mark them active
 */
export const markUserActive = (id) => {
  if (!id) return;
  const uid = String(id);
  lastSeenAt[uid] = Date.now();
};

/**
 * ✅ Clears UI/Delivery timer if active
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
 * ✅ Clears payment timer if active
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
 * ✅ Full session reset (timers + memory state)
 */
export const resetSession = (id) => {
  const uid = String(id);
  if (!uid) return;

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

  console.log(`🧼 Session reset complete → ${uid}`);
};

/**
 * ⏳ Expires idle or zombie sessions (should run every X min)
 */
export const autoExpireSessions = (threshold = DEFAULT_EXPIRE_THRESHOLD) => {
  const now = Date.now();
  const expired = [];

  for (const [id, last] of Object.entries(lastSeenAt)) {
    const s = userSessions[id];
    const idle = now - last;
    const isExpired = idle > threshold;
    const isFrozen = s?.step >= 1 && idle > STEP_TIMEOUT;

    if (isExpired || isFrozen) {
      expired.push(id);
    }
  }

  for (const id of expired) {
    resetSession(id);
    console.log(`⏳ AUTO-EXPIRE session killed → ${id}`);
  }
};

/**
 * ✅ Returns total number of tracked sessions
 */
export const getActiveUsersCount = () => {
  return Object.keys(userSessions).length;
};

/**
 * 🔥 Forces full session cleanup for all users (e.g., on deploy)
 */
export const wipeAllSessions = () => {
  const ids = Object.keys(userSessions);
  for (const id of ids) {
    resetSession(id);
  }
  console.log(`🔥 All sessions wiped — ${ids.length} users`);
};

/**
 * 🧹 Clears payment timers not tied to step 8
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
 * 🧾 Debug tool to print all current sessions
 */
export const printSessionSummary = () => {
  const now = Date.now();
  const users = Object.keys(userSessions);

  console.log(`📊 Active sessions: ${users.length}`);

  for (const id of users) {
    const s = userSessions[id];
    const last = lastSeenAt[id]
      ? `${Math.floor((now - lastSeenAt[id]) / 1000)}s ago`
      : "n/a";

    console.log(`— ${id}: step=${s?.step || "?"}, city=${s?.city || "?"}, lastActive=${last}`);
  }
};
