// 📦 state/stateManager.js | FINAL IMMORTAL DIAMONDLOCK v999999999.∞ — GODMODE SYNC + BULLETPROOF CORE

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
 * 🧼 Clears ALL user state: session, messages, bans, timers
 * @param {string|number} id - User ID
 */
export function resetUser(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    clearTimers(uid);

    const stateStores = [
      userSessions,
      userOrders,
      userMessages,
      failedAttempts,
      antiSpam,
      bannedUntil,
      antiFlood
    ];

    for (const store of stateStores) {
      if (store?.[uid] !== undefined) delete store[uid];
    }

    activeUsers.remove(uid);

    logAction("🧼 [resetUser]", `State fully cleared for user`, uid);
  } catch (err) {
    logError("❌ [resetUser error]", err, uid);
  }
}

/**
 * 🧹 Clears spam/anti-flood/security flags (not session or orders)
 * @param {string|number} id - User ID
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

    logAction("🧹 [clearUserActivity]", `Security flags cleared for user`, uid);
  } catch (err) {
    logError("❌ [clearUserActivity error]", err, uid);
  }
}

/**
 * 🗑️ Clears tracked messages (for autodelete logic)
 * @param {string|number} id - User ID
 */
export function clearUserMessages(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    delete userMessages[uid];
    logAction("🗑️ [clearUserMessages]", `Messages cleared for user`, uid);
  } catch (err) {
    logError("❌ [clearUserMessages error]", err, uid);
  }
}

/**
 * 🕒 Stops active delivery/payment timers and removes cleanup flags
 * @param {string|number} id - User ID
 */
export function clearTimers(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    if (activeTimers[uid]) {
      clearTimeout(activeTimers[uid]);
      delete activeTimers[uid];
      logAction("🕒 [clearTimers]", `Active timer cleared for user`, uid);
    }

    if (paymentTimers[uid]) {
      clearTimeout(paymentTimers[uid]);
      delete paymentTimers[uid];
      logAction("💳 [clearTimers]", `Payment timer cleared for user`, uid);
    }

    if (userSessions[uid]?.cleanupScheduled) {
      delete userSessions[uid].cleanupScheduled;
      logAction("🧼 [clearTimers]", `Cleanup flag removed for user`, uid);
    }
  } catch (err) {
    logError("❌ [clearTimers error]", err, uid);
  }
}

/**
 * 🚫 Force-destroys all user state — full cleanup
 * @param {string|number} id - User ID
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
 * 🛡️ Checks if a user is registered in the system
 * @param {string|number} id - User ID
 * @returns {boolean} - True if user exists in the system
 */
export function isUserRegistered(id) {
  const uid = safeId(id);
  const registered = uid && userSessions[uid] !== undefined;
  logAction("🛡️ [isUserRegistered]", `User ${registered ? "is" : "is not"} registered`, uid);
  return registered;
}

/**
 * 🧠 Safely sanitizes user ID (null/undefined/empty prevention)
 * @param {string|number} id - Input ID
 * @returns {string|null} - Sanitized ID or null if invalid
 */
function safeId(id) {
  const str = String(id ?? "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}

/**
 * 📝 Logs successful actions with timestamps
 * @param {string} action - Action description
 * @param {string} message - Additional details
 * @param {string} [uid] - User ID (optional)
 */
function logAction(action, message, uid = null) {
  console.log(`${new Date().toISOString()} ${action} → ${message}${uid ? ` (ID: ${uid})` : ""}`);
}

/**
 * ⚠️ Logs errors with timestamps
 * @param {string} action - Action description
 * @param {Error|string} error - Error object or message
 * @param {string} [uid] - User ID (optional)
 */
function logError(action, error, uid = null) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (ID: ${uid})` : ""}`);
}
