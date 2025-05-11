// 📦 core/sessionManager.js | IMMORTAL FINAL v9999999999999 — TITAN SYNC + ZOMBIE SLAYER

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

const lastSeenAt = {}; // ⏱️ Tracks last activity

const STEP_TIMEOUT = 60 * 60 * 1000;             // 1h — zombie
const DEFAULT_EXPIRE_THRESHOLD = 45 * 60 * 1000; // 45min — idle

/** ✅ Register activity */
export const markUserActive = (id) => {
  const uid = String(id || "").trim();
  if (uid) lastSeenAt[uid] = Date.now();
};

/** ✅ Clear UI timer */
export const clearUserTimer = (id) => {
  const uid = String(id || "").trim();
  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    console.log(`🕒 UI timer cleared → ${uid}`);
  }
};

/** ✅ Clear payment timer */
export const clearPaymentTimer = (id) => {
  const uid = String(id || "").trim();
  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    console.log(`💳 Payment timer cleared → ${uid}`);
  }
};

/** ✅ Total cleanup for user session */
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
      if (store && store[uid] !== undefined) {
        delete store[uid];
      }
    }

    console.log(`🧼 Session reset → ${uid}`);
  } catch (err) {
    console.error("❌ [resetSession error]:", err.message);
  }
};

/** ⏱️ Kill idle/zombie sessions */
export const autoExpireSessions = (threshold = DEFAULT_EXPIRE_THRESHOLD) => {
  const now = Date.now();
  const expired = [];

  for (const [id, last] of Object.entries(lastSeenAt)) {
    const session = userSessions[id];
    const idle = now - last;

    const isZombie = session?.step >= 1 && idle > STEP_TIMEOUT;
    const isIdle = idle > threshold;

    if (isZombie || isIdle) {
      expired.push({ id, zombie: isZombie });
    }
  }

  for (const { id, zombie } of expired) {
    resetSession(id);
    console.log(`⏳ AUTO-EXPIRE (${zombie ? "ZOMBIE" : "IDLE"}) → ${id}`);
  }
};

/** 📊 Count currently tracked users */
export const getActiveUsersCount = () => {
  return Object.keys(lastSeenAt).length;
};

/** 🔥 Dev: full reset */
export const wipeAllSessions = () => {
  const ids = Object.keys(userSessions);
  for (const id of ids) resetSession(id);
  console.log(`🔥 wipeAllSessions → ${ids.length} wiped`);
};

/** 🧽 Cleanup orphaned payment timers */
export const cleanStalePaymentTimers = () => {
  for (const id in paymentTimers) {
    const step = userSessions[id]?.step;
    if (step !== 8) {
      clearPaymentTimer(id);
      console.log(`🧽 Stale payment timer cleared → ${id}`);
    }
  }
};

/** 🧪 Developer/debug view */
export const printSessionSummary = () => {
  const now = Date.now();
  const sessions = Object.entries(userSessions);
  console.log(`📊 Active sessions: ${sessions.length}`);

  for (const [id, session] of sessions) {
    const last = lastSeenAt[id];
    const lastSeen = last ? `${Math.floor((now - last) / 1000)}s ago` : "unknown";
    console.log(`— ${id} | step=${session.step ?? "?"} | lastSeen=${lastSeen}`);
  }
};
