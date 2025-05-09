// 📦 core/sessionManager.js | FINAL IMMORTAL v99999999.9 — TITAN SYNC+ MIRROR POLISH

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
 * ✅ Marks user as active (on any interaction)
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
 * ✅ Clears payment timeout
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
 * ✅ Resets full session, memory, flags, timers
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
 * ⏳ Auto-expires idle or zombie sessions
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
 * 📊 Returns number of live sessions
 */
export const getActiveUsersCount = () => {
  return Object.keys(userSessions).length;
};

/**
 * 🔥 Dev tool — wipe everything (on deploy/hard reset)
 */
export const wipeAllSessions = () => {
  const ids = Object.keys(userSessions);
  for (const id of ids) resetSession(id);
  console.log(`🔥 wipeAllSessions() → ${ids.length} sessions wiped`);
};

/**
 * 🧽 Cleans hanging payment timers for users no longer in step 8
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
 * 🧪 Dev/debug tool: prints session overview
 */
export const printSessionSummary = () => {
  const now = Date.now();
  const sessions = Object.entries(userSessions);

  console.log(`📊 Active sessions: ${sessions.length}`);

  for (const [id, session] of sessions) {
    const lastSeen = lastSeenAt[id]
      ? `${Math.floor((now - lastSeenAt[id]) / 1000)}s ago`
      : "unknown";
    console.log(`— ${id} | step=${session.step ?? "?"} | last=${lastSeen}`);
  }
};
