// 📦 state/userState.js | FINAL IMMORTAL BULLETPROOF LOCKED v999999999.0

// ==============================
// 🔁 User sessions and progress tracking
// ==============================

export const userSessions = {};   // { [userId]: { step, city, product, ... } }
export const userOrders = {};     // { [userId]: number }
export const userMessages = {};   // { [userId]: [messageId, ...] }

// ==============================
// 🛡️ Security and time-based data
// ==============================

export const activeTimers = {};     // Delivery cleanup
export const paymentTimers = {};    // Payment expiry
export const failedAttempts = {};   // Invalid input tracker
export const bannedUntil = {};      // { userId: timestampMs }
export const antiSpam = {};         // { userId: timestampMs }
export const antiFlood = {};        // { userId: [timestamps] }

// ==============================
// 📊 Real-time activity monitor
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
// 🔧 State management helpers
// ==============================

/**
 * ✅ Clears all state & timers for a user
 */
export function clearUserSession(id) {
  const uid = safeString(id);
  if (!uid) return;

  clearTimersForUser(uid);

  [
    userSessions,
    userOrders,
    userMessages,
    failedAttempts,
    bannedUntil,
    antiSpam,
    antiFlood
  ].forEach(store => {
    if (uid in store) delete store[uid];
  });

  activeUsers.remove(uid);
  console.log(`🧼 Session fully cleared for ${uid}`);
}

/**
 * ✅ Starts a fresh session (step 1)
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
 * ✅ Tracks failed inputs and bans after 5
 */
export function trackFailedAttempts(id) {
  const uid = safeString(id);
  if (!uid) return;

  failedAttempts[uid] = (failedAttempts[uid] || 0) + 1;

  if (failedAttempts[uid] >= 5) {
    bannedUntil[uid] = Date.now() + 15 * 60 * 1000;
    console.warn(`⛔️ ${uid} autobanned for too many failed inputs.`);
  }
}

/**
 * ✅ Clears user timers (delivery + payment)
 */
export function clearTimersForUser(id) {
  const uid = safeString(id);
  if (!uid) return;

  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    console.log(`🕒 ⛔️ Active timer cleared → ${uid}`);
  }

  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    console.log(`💳 ⛔️ Payment timer cleared → ${uid}`);
  }
}

/**
 * 🧠 Utility: validates and cleans any ID
 */
function safeString(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}
