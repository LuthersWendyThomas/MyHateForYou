// 📦 state/stateManager.js | FINAL IMMORTAL v999999999.9999 — CORE SYSTEM LOCK + GODMODE SYNC

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
 * ✅ Clears ALL user state: session, messages, bans, timers
 */
export function resetUser(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    clearTimers(uid);

    [
      userSessions,
      userOrders,
      userMessages,
      failedAttempts,
      antiSpam,
      bannedUntil,
      antiFlood
    ].forEach(store => {
      if (store?.[uid] !== undefined) delete store[uid];
    });

    activeUsers.remove(uid);

    logAction("🧼 [resetUser]", `State fully cleared`, uid);
  } catch (err) {
    logError("❌ [resetUser error]", err, uid);
  }
}

/**
 * ✅ Clears spam/anti-flood/security flags (not session or orders)
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

    logAction("🧹 [clearUserActivity]", `Security flags cleared`, uid);
  } catch (err) {
    logError("❌ [clearUserActivity error]", err, uid);
  }
}

/**
 * ✅ Clears tracked messages (for autodelete logic)
 */
export function clearUserMessages(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    delete userMessages[uid];
    logAction("🗑️ [clearUserMessages]", `Messages cleared`, uid);
  } catch (err) {
    logError("❌ [clearUserMessages error]", err, uid);
  }
}

/**
 * ✅ Stops active delivery/payment timers and removes cleanup flags
 */
export function clearTimers(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    if (activeTimers[uid]) {
      clearTimeout(activeTimers[uid]);
      delete activeTimers[uid];
      logAction("🕒 [clearTimers]", `UI timer stopped`, uid);
    }

    if (paymentTimers[uid]) {
      clearTimeout(paymentTimers[uid]);
      delete paymentTimers[uid];
      logAction("💳 [clearTimers]", `Payment timer stopped`, uid);
    }

    if (userSessions[uid]?.cleanupScheduled) {
      delete userSessions[uid].cleanupScheduled;
      logAction("🧼 [clearTimers]", `Cleanup flag removed`, uid);
    }
  } catch (err) {
    logError("❌ [clearTimers error]", err, uid);
  }
}

/**
 * ✅ Force-destroys all user state — full cleanup
 */
export function unregisterUser(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    clearTimers(uid);
    clearUserMessages(uid);
    resetUser(uid);

    logAction("🚫 [unregisterUser]", `User fully unregistered`, uid);
  } catch (err) {
    logError("❌ [unregisterUser error]", err, uid);
  }
}

/**
 * ✅ Checks if a user is registered in the system
 */
export function isUserRegistered(id) {
  const uid = safeId(id);
  return uid && userSessions[uid] !== undefined;
}

/**
 * 🧠 Safe ID sanitizer (null/undefined/empty prevention)
 */
function safeId(id) {
  const str = String(id ?? "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}

/**
 * 📝 Logs successful actions with timestamps
 */
function logAction(action, message, uid) {
  console.log(`${new Date().toISOString()} ${action} → ${message}: ${uid}`);
}

/**
 * ⚠️ Logs errors with timestamps
 */
function logError(action, error, uid) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error} (uid: ${uid})`);
}
