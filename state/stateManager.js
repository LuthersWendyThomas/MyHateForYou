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

    for (const store of stores) {
      if (store?.[uid] !== undefined) delete store[uid];
    }

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
    delete userMessages[uid];
    delete failedAttempts[uid];
    delete antiSpam[uid];
    delete antiFlood[uid];

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
    if (activeTimers?.[uid]) {
      clearTimeout(activeTimers[uid]);
      delete activeTimers[uid];
      console.log(`🕒 ⛔️ Delivery timer cleared: ${uid}`);
    }

    if (paymentTimers?.[uid]) {
      clearTimeout(paymentTimers[uid]);
      delete paymentTimers[uid];
      console.log(`💳 ⛔️ Payment timer cleared: ${uid}`);
    }

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
