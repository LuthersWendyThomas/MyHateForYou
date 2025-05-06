// 📦 state/userState.js | BalticPharma V2 — IMMORTAL v2025.6 DIAMOND GRIDLOCK FINAL EDITION

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
export const antiFlood = {};        // { [userId]: number[] } – anti-flood times

// ==============================
// 📊 Real-Time activity tracker
// ==============================

/**
 * ✅ Active user tracking (used for analytics and UX statistics)
 */
export const activeUsers = {
  list: new Set(),

  get count() {
    return this.list.size;
  },

  add(id) {
    const uid = String(id);
    this.list.add(uid);
  },

  remove(id) {
    const uid = String(id);
    this.list.delete(uid);
  },

  has(id) {
    return this.list.has(String(id));
  },

  reset() {
    this.list.clear();
  }
};

// ==============================
// 🔧 Session & State Management Helpers
// ==============================

/**
 * ✅ Clears the session data for the user
 */
export function clearUserSession(uid) {
  const userId = String(uid);

  delete userSessions[userId];
  delete userOrders[userId];
  delete userMessages[userId];
  delete activeTimers[userId];
  delete paymentTimers[userId];
  delete failedAttempts[userId];
  delete bannedUntil[userId];
  delete antiSpam[userId];
  delete antiFlood[userId];

  activeUsers.remove(userId);
  console.log(`🧼 Session cleared for ${userId}`);
}

/**
 * ✅ Safe start, initializes a new session for the user
 */
export function safeStartSession(uid) {
  userSessions[String(uid)] = {
    step: 1,
    createdAt: Date.now()
  };

  activeUsers.add(uid);
  console.log(`✅ New session started for ${uid}`);
}

/**
 * ✅ Tracks failed attempts and bans after exceeding the limit
 */
export function trackFailedAttempts(uid) {
  const attempts = (failedAttempts[uid] || 0) + 1;
  failedAttempts[uid] = attempts;

  if (attempts >= 5) {
    bannedUntil[uid] = Date.now() + 15 * 60 * 1000; // Ban for 15 minutes
    console.warn(`⛔️ User ${uid} banned due to too many failed attempts.`);
  }
}

/**
 * ✅ Clears timers associated with the user (payment or session)
 */
export function clearTimersForUser(uid) {
  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
  }

  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
  }

  console.log(`🕒 Timers cleared for ${uid}`);
}
