// 📦 state/stateManager.js | BalticPharma V2 — IMMORTAL v2025.6 DIAMOND ENGINE FINAL LOCK

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
 * ✅ Complete clearing of user data and timers
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
      activeTimers,
      paymentTimers,
      failedAttempts,
      antiSpam,
      bannedUntil,
      antiFlood
    ];

    // Clear all relevant user data
    for (const store of stores) {
      if (store?.[uid] !== undefined) delete store[uid];
    }

    // Ensure user is removed from active users set
    activeUsers.remove(uid);
    console.log(`🧼 Users ${uid} full state cleared.`);
  } catch (err) {
    console.error("❌ [resetUser error]:", err.message);
  }
}

/**
 * ✅ Clears activity logic (spam, flood, messages), but leaves the session
 */
export function clearUserActivity(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    // Clear only activity data while preserving the session
    delete userMessages[uid];
    delete failedAttempts[uid];
    delete antiSpam[uid];
    delete antiFlood[uid];

    // Ensure user is removed from active users set
    activeUsers.remove(uid);
    console.log(`🧹 Cleared activity (without session): ${uid}`);
  } catch (err) {
    console.error("❌ [clearUserActivity error]:", err.message);
  }
}

/**
 * ✅ Clears only the user's message ID list (uses autodelete logic)
 */
export function clearUserMessages(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    // Clear user's message IDs
    delete userMessages[uid];
  } catch (err) {
    console.error("❌ [clearUserMessages error]:", err.message);
  }
}

/**
 * ✅ Clears the user's delivery and payment timers
 */
export function clearTimers(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    // Clear the active delivery timer
    if (activeTimers?.[uid]) {
      clearTimeout(activeTimers[uid]);
      delete activeTimers[uid];
      console.log(`🕒 ⛔️ Delivery timer cleared: ${uid}`);
    }

    // Clear the active payment timer
    if (paymentTimers?.[uid]) {
      clearTimeout(paymentTimers[uid]);
      delete paymentTimers[uid];
      console.log(`💳 ⛔️ Payment timer cleared: ${uid}`);
    }

    // Clear cleanup scheduled flag from user session
    if (userSessions?.[uid]?.cleanupScheduled) {
      delete userSessions[uid].cleanupScheduled;
      console.log(`🧼 cleanupScheduled flag cleared: ${uid}`);
    }
  } catch (err) {
    console.error("❌ [clearTimers error]:", err.message);
  }
}

/**
 * ✅ Complete removal of a user from the entire system
 */
export function unregisterUser(id) {
  try {
    const uid = safeId(id);
    if (!uid) return;

    // Clear timers, messages, and reset user state
    clearTimers(uid);
    clearUserMessages(uid);
    resetUser(uid);
  } catch (err) {
    console.error("❌ [unregisterUser error]:", err.message);
  }
}

/**
 * ✅ Ensures that the ID is always safe and of type string
 */
function safeId(id) {
  const uid = String(id || "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}
