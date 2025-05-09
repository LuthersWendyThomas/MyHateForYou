// 📦 state/userState.js | FINAL IMMORTAL BULLETPROOF EDITION v2025.9

// ==============================
// 🔁 User sessions and order progress
// ==============================

export const userSessions = {};     // { [userId]: { step, city, product, ... } }
export const userOrders = {};       // { [userId]: number }
export const userMessages = {};     // { [userId]: [messageId1, messageId2, ...] }

// ==============================
// 🛡️ Security data (bans, flood, spam, timers)
// ==============================

export const activeTimers = {};     // { [userId]: Timeout } – delivery timers
export const paymentTimers = {};    // { [userId]: Timeout } – payment timers
export const failedAttempts = {};   // { [userId]: number } – number of incorrect attempts
export const bannedUntil = {};      // { [userId]: timestampMs } – temporary bans
export const antiSpam = {};         // { [userId]: timestampMs } – anti-spam tracker
export const antiFlood = {};        // { [userId]: number[] } – anti-flood window

// ==============================
// 📊 Real-Time activity tracker
// ==============================

export const activeUsers = {
  list: new Set(),

  get count() {
    return this.list.size;
  },

  add(id) {
    const uid = safeString(id);
    if (uid) this.list.add(uid);
  },

  remove(id) {
    const uid = safeString(id);
    if (uid) this.list.delete(uid);
  },

  has(id) {
    return this.list.has(safeString(id));
  },

  reset() {
    this.list.clear();
  }
};

// ==============================
// 🔧 Session & State Management Helpers
// ==============================

/**
 * ✅ Completely clears all user state and timers
 */
export function clearUserSession(id) {
  const uid = safeString(id);
  if (!uid) return;

  // Timers
  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
  }

  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
  }

  // Stores
  [
    userSessions,
    userOrders,
    userMessages,
    failedAttempts,
    bannedUntil,
    antiSpam,
    antiFlood
  ].forEach(store => {
    if (store?.[uid] !== undefined) delete store[uid];
  });

  // Remove from active
  activeUsers.remove(uid);
  console.log(`🧼 Session fully cleared for ${uid}`);
}

/**
 * ✅ Safe session start (step 1)
 */
export function safeStartSession(id) {
  const uid = safeString(id);
  if (!uid) return;

  userSessions[uid] = {
    step: 1,
    createdAt: Date.now()
  };

  activeUsers.add(uid);
  console.log(`✅ New session started for ${uid}`);
}

/**
 * ✅ Track failed attempts and ban on abuse
 */
export function trackFailedAttempts(id) {
  const uid = safeString(id);
  if (!uid) return;

  const attempts = (failedAttempts[uid] || 0) + 1;
  failedAttempts[uid] = attempts;

  if (attempts >= 5) {
    bannedUntil[uid] = Date.now() + 15 * 60 * 1000;
    console.warn(`⛔️ User ${uid} banned for too many failed attempts.`);
  }
}

/**
 * ✅ Clears all user timers only (safe fallback)
 */
export function clearTimersForUser(id) {
  const uid = safeString(id);
  if (!uid) return;

  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    console.log(`🕒 ⛔️ Active timer cleared for ${uid}`);
  }

  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    console.log(`💳 ⛔️ Payment timer cleared for ${uid}`);
  }
}

/**
 * 🛡️ Utility: safely stringify any ID and validate
 */
function safeString(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}
