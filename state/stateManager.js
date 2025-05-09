// 📦 state/stateManager.js | BalticPharma V2 — IMMORTAL v2025.9 FINAL BULLETPROOF LOCKED

import {
  userSessions,
  userOrders,
  userMessages,
  activeTimers,
  paymentTimers,
  failedAttempts,
  antiSpam,
  bannedUntil,
  antiFlood,
  activeUsers
} from "./userState.js";

/**
 * ✅ Completely clears user state and timers
 */
export function resetUser(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    clearTimers(uid);

    const stores = [
      userSessions,
      userOrders,
      userMessages,
      failedAttempts,
      antiSpam,
      bannedUntil,
      antiFlood
    ];

    for (const store of stores) {
      if (store && typeof store === "object" && uid in store) {
        delete store[uid];
      }
    }

    // Remove timers
    delete activeTimers[uid];
    delete paymentTimers[uid];

    activeUsers.remove(uid);
    console.log(`🧼 User state fully reset: ${uid}`);
  } catch (err) {
    console.error("❌ [resetUser error]:", err.message || err);
  }
}

/**
 * ✅ Clears spam/flood/activity without deleting the session
 */
export function clearUserActivity(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    delete userMessages[uid];
    delete failedAttempts[uid];
    delete antiSpam[uid];
    delete antiFlood[uid];

    activeUsers.remove(uid);
    console.log(`🧹 Activity cleared for user (session preserved): ${uid}`);
  } catch (err) {
    console.error("❌ [clearUserActivity error]:", err.message || err);
  }
}

/**
 * ✅ Clears user-tracked message IDs (for autodelete logic)
 */
export function clearUserMessages(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    delete userMessages[uid];
  } catch (err) {
    console.error("❌ [clearUserMessages error]:", err.message || err);
  }
}

/**
 * ✅ Clears delivery/payment timers and session flags
 */
export function clearTimers(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    if (activeTimers[uid]) {
      clearTimeout(activeTimers[uid]);
      delete activeTimers[uid];
      console.log(`🕒 UI timer cleared: ${uid}`);
    }

    if (paymentTimers[uid]) {
      clearTimeout(paymentTimers[uid]);
      delete paymentTimers[uid];
      console.log(`💳 Payment timer cleared: ${uid}`);
    }

    if (userSessions[uid]?.cleanupScheduled) {
      delete userSessions[uid].cleanupScheduled;
      console.log(`🧼 Session cleanup flag cleared: ${uid}`);
    }
  } catch (err) {
    console.error("❌ [clearTimers error]:", err.message || err);
  }
}

/**
 * ✅ Completely unregisters a user from system
 */
export function unregisterUser(id) {
  try {
    const uid = safeId(id);
    if (!uid) return;

    clearTimers(uid);
    clearUserMessages(uid);
    resetUser(uid);
  } catch (err) {
    console.error("❌ [unregisterUser error]:", err.message || err);
  }
}

/**
 * ✅ Safely stringifies user ID
 */
function safeId(id) {
  const uid = String(id ?? "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}
