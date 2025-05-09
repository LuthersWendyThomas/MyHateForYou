// 📦 state/stateManager.js | FINAL IMMORTAL v999999999.0 — CORE SYSTEM LOCK

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
 * ✅ Fully clears all user state, timers, spam flags, and tracking
 */
export function resetUser(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    clearTimers(uid);

    [userSessions, userOrders, userMessages, failedAttempts, antiSpam, bannedUntil, antiFlood].forEach(store => {
      if (store?.[uid] !== undefined) delete store[uid];
    });

    delete activeTimers[uid];
    delete paymentTimers[uid];

    activeUsers.remove(uid);
    console.log(`🧼 [resetUser] → State fully cleared: ${uid}`);
  } catch (err) {
    console.error("❌ [resetUser error]:", err.message || err);
  }
}

/**
 * ✅ Clears only activity and security-related data
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
    console.log(`🧹 [clearUserActivity] → Security flags cleared: ${uid}`);
  } catch (err) {
    console.error("❌ [clearUserActivity error]:", err.message || err);
  }
}

/**
 * ✅ Clears only tracked messages (for autodelete)
 */
export function clearUserMessages(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    delete userMessages[uid];
    console.log(`🗑️ [clearUserMessages] → Messages cleared: ${uid}`);
  } catch (err) {
    console.error("❌ [clearUserMessages error]:", err.message || err);
  }
}

/**
 * ✅ Stops and clears delivery/payment timers + session flags
 */
export function clearTimers(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    if (activeTimers[uid]) {
      clearTimeout(activeTimers[uid]);
      delete activeTimers[uid];
      console.log(`🕒 [clearTimers] UI timer stopped: ${uid}`);
    }

    if (paymentTimers[uid]) {
      clearTimeout(paymentTimers[uid]);
      delete paymentTimers[uid];
      console.log(`💳 [clearTimers] Payment timer stopped: ${uid}`);
    }

    if (userSessions[uid]?.cleanupScheduled) {
      delete userSessions[uid].cleanupScheduled;
      console.log(`🧼 [clearTimers] Cleanup flag removed: ${uid}`);
    }
  } catch (err) {
    console.error("❌ [clearTimers error]:", err.message || err);
  }
}

/**
 * ✅ Total user removal from the system
 */
export function unregisterUser(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    clearTimers(uid);
    clearUserMessages(uid);
    resetUser(uid);
    console.log(`🚫 [unregisterUser] → User fully unregistered: ${uid}`);
  } catch (err) {
    console.error("❌ [unregisterUser error]:", err.message || err);
  }
}

/**
 * ✅ Sanitizes and validates user ID
 */
function safeId(id) {
  const str = String(id ?? "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}
