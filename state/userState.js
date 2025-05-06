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

export const activeTimers = {};     // { [userId]: Timeout } – pristatymo laikmačiai
export const paymentTimers = {};    // { [userId]: Timeout } – mokėjimų laikmačiai
export const failedAttempts = {};   // { [userId]: number } – neteisingų bandymų skaičius
export const bannedUntil = {};      // { [userId]: timestampMs } – laikini banai
export const antiSpam = {};         // { [userId]: timestampMs } – anti-spam trackeris
export const antiFlood = {};        // { [userId]: number[] } – anti-flood laikai


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
