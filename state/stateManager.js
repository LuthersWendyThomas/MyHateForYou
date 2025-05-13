// 📦 state/stateManager.js | IMMORTAL FINAL v1.0.9•999999999X•GODMODE•DIAMONDLOCK
// MAX-SYNCED • ZOMBIE SAFE • ANTI-LEAK • 24/7 BULLETPROOF • FSM READY

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
 * 🧼 Full purge of user: sessions, messages, timers, flags, orders
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
      if (uid in store) delete store[uid];
    });

    activeUsers.remove(uid);
    logAction("🧼 [resetUser]", "All state cleared", uid);
  } catch (err) {
    logError("❌ [resetUser error]", err, uid);
  }
}

/**
 * 🧹 Clears all temporary flags and messages (keeps session+orders)
 */
export function clearUserActivity(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    delete userMessages[uid];
    delete failedAttempts[uid];
    delete antiSpam[uid];
    delete antiFlood[uid];
    delete bannedUntil[uid];

    activeUsers.remove(uid);
    logAction("🧹 [clearUserActivity]", "Flags/messages cleared", uid);
  } catch (err) {
    logError("❌ [clearUserActivity error]", err, uid);
  }
}

/**
 * 🗑️ Deletes only tracked messages (used for auto-delete)
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
 * ⏱️ Stops any active delivery/payment timers & flags
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
 * 🚫 Full unregistration: resets everything, including order stats
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
 * 🛡️ Checks if user has an active session
 */
export function isUserRegistered(id) {
  const uid = sanitizeId(id);
  const registered = uid != null && userSessions[uid] !== undefined;
  logAction("🛡️ [isUserRegistered]", registered ? "✅ Registered" : "❌ Not registered", uid);
  return registered;
}

// ———————————————————————————
// 🔧 Helpers
// ———————————————————————————

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logAction(action, msg, uid = "") {
  console.log(`${new Date().toISOString()} ${action} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}

function logError(action, err, uid = "") {
  const m = err?.message || err;
  console.error(`${new Date().toISOString()} ${action} → ${m}${uid ? ` (UID: ${uid})` : ""}`);
}
