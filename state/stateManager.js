// 📦 state/stateManager.js | FINAL IMMORTAL v1.0.0•GODMODE DIAMONDLOCK
// SYNCED • BULLETPROOF CORE • FULL RESET • ULTRA-OPTIMIZED

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
 * 🧼 Fully clears all state for a user: sessions, orders, messages, timers, bans, flags
 */
export function resetUser(id) {
  const uid = sanitizeId(id);
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
      if (store[uid] !== undefined) delete store[uid];
    });

    activeUsers.remove(uid);
    logAction("🧼 [resetUser]", "All state cleared", uid);
  } catch (err) {
    logError("❌ [resetUser error]", err, uid);
  }
}

/**
 * 🧹 Clears only security/activity flags and tracked messages (not orders or session)
 */
export function clearUserActivity(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    delete userMessages[uid];
    delete failedAttempts[uid];
    delete antiSpam[uid];
    delete antiFlood[uid];
    bannedUntil[uid] = null;
    activeUsers.remove(uid);

    logAction("🧹 [clearUserActivity]", "Security flags cleared", uid);
  } catch (err) {
    logError("❌ [clearUserActivity error]", err, uid);
  }
}

/**
 * 🗑️ Clears only tracked messages for autodelete or cleanup logic
 */
export function clearUserMessages(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    delete userMessages[uid];
    logAction("🗑️ [clearUserMessages]", "Tracked messages cleared", uid);
  } catch (err) {
    logError("❌ [clearUserMessages error]", err, uid);
  }
}

/**
 * 🕒 Stops and removes any delivery/payment timers and cleanup flags
 */
export function clearTimers(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    if (activeTimers[uid]) {
      clearTimeout(activeTimers[uid]);
      delete activeTimers[uid];
      logAction("🕒 [clearTimers]", "Active timer cleared", uid);
    }
    if (paymentTimers[uid]) {
      clearTimeout(paymentTimers[uid]);
      delete paymentTimers[uid];
      logAction("💳 [clearTimers]", "Payment timer cleared", uid);
    }
    if (userSessions[uid]?.cleanupScheduled) {
      delete userSessions[uid].cleanupScheduled;
      logAction("🧼 [clearTimers]", "Cleanup flag removed", uid);
    }
  } catch (err) {
    logError("❌ [clearTimers error]", err, uid);
  }
}

/**
 * 🚫 Completely unregisters a user: all state, messages, timers, and sessions
 */
export function unregisterUser(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    clearTimers(uid);
    clearUserMessages(uid);
    resetUser(uid);

    logAction("🚫 [unregisterUser]", "User fully unregistered", uid);
  } catch (err) {
    logError("❌ [unregisterUser error]", err, uid);
  }
}

/**
 * 🛡️ Checks if a user has an active session
 * @returns {boolean}
 */
export function isUserRegistered(id) {
  const uid = sanitizeId(id);
  const registered = uid != null && userSessions[uid] !== undefined;
  logAction("🛡️ [isUserRegistered]", `User is ${registered ? "" : "not "}registered`, uid);
  return registered;
}

// ————— HELPERS —————

/**
 * 🔒 Safely sanitize any ID into a non-empty string or return null
 */
function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

/**
 * 📋 Uniform action logger
 */
function logAction(action, message, uid = "") {
  console.log(`${new Date().toISOString()} ${action} → ${message}${uid ? ` (UID: ${uid})` : ""}`);
}

/**
 * 🚨 Uniform error logger
 */
function logError(action, error, uid = "") {
  const msg = error?.message || error;
  console.error(`${new Date().toISOString()} ${action} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}
