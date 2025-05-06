// 🧠 core/sessionManager.js | BalticPharma V2 — IMMORTAL v2025.6 TITANLOCK SYNC EDITION

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

const lastSeenAt = {};
const STEP_TIMEOUT = 60 * 60 * 1000;         // 1 hour
const DEFAULT_EXPIRE_THRESHOLD = 45 * 60 * 1000; // 45 minutes

/**
 * ✅ Marks the user as active (should be called as soon as a message is received)
 */
export const markUserActive = (id) => {
  if (!id) return;
  lastSeenAt[String(id)] = Date.now();
};

/**
 * ✅ Clears the delivery (UI) timer
 */
export const clearUserTimer = (id) => {
  const uid = String(id);
  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    console.log(`🕒 ⛔️ UI timer cleared: ${uid}`);
  }
};

/**
 * ✅ Clears the payment timer
 */
export const clearPaymentTimer = (id) => {
  const uid = String(id);
  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    console.log(`💳 ⛔️ Payment timer cleared: ${uid}`);
  }
};

/**
 * ✅ Fully clears the user's session and memory state
 */
export const resetSession = (id) => {
  const uid = String(id);
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
    if (store[uid]) delete store[uid];
  }

  console.log(`🧼 ✅ Session reset: ${uid}`);
};

/**
 * ⏳ Automatically expires old/frozen sessions
 */
export const autoExpireSessions = (threshold = DEFAULT_EXPIRE_THRESHOLD) => {
  const now = Date.now();
  const expired = [];

  for (const [id, last] of Object.entries(lastSeenAt)) {
    const s = userSessions[id];
    const age = now - last;
    const isExpired = age > threshold;
    const isFrozen = s?.step >= 1 && age > STEP_TIMEOUT;

    if (isExpired || isFrozen) expired.push(id);
  }

  for (const id of expired) {
    resetSession(id);
    console.log(`⏳ AUTO-EXPIRE executed: ${id}`);
  }
};

/**
 * ✅ Returns the number of currently active users
 */
export const getActiveUsersCount = () => {
  return Object.keys(userSessions).length;
};

/**
 * ✅ Full session wipe (e.g., during deploy)
 */
export const wipeAllSessions = () => {
  for (const id of Object.keys(userSessions)) {
    resetSession(id);
  }
  console.log("🔥 ALL sessions wiped (wipeAllSessions)");
};

/**
 * ✅ Clears stale payment timers (not in step 8)
 */
export const cleanStalePaymentTimers = () => {
  for (const id in paymentTimers) {
    const isValid = userSessions[id]?.step === 8;
    if (!isValid) clearPaymentTimer(id);
  }
};

/**
 * ✅ Debug — prints a summary of active users and sessions
 */
export const printSessionSummary = () => {
  const now = Date.now();
  const users = Object.keys(userSessions);
  console.log(`📊 Active users: ${users.length}`);

  for (const id of users) {
    const s = userSessions[id];
    const last = lastSeenAt[id]
      ? `${Math.floor((now - lastSeenAt[id]) / 1000)}s ago`
      : "n/a";

    console.log(`— ${id}: step=${s?.step}, city=${s?.city || "?"}, last active: ${last}`);
  }
};

