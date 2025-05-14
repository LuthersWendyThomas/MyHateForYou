// 📦 state/stateManager.js | IMMORTAL FINAL v2.0.0•9999999999X•DIAMONDLOCK•SYNCED•BULLETPROOF
// MAX-STABILITY • 24/7 SAFE • FSM + PAYMENT + CLEANUP INTEGRATED • SESSION + WALLET + TIMER RESET

import {
  userSessions,
  userOrders,
  userMessages,
  userWallets,
  failedAttempts,
  antiSpam,
  bannedUntil,
  antiFlood,
  activeUsers
} from "./userState.js";

import { clearTimersForUser } from "./timers.js";

/**
 * 🧼 Full reset: session, orders, messages, wallet, flags, timers
 */
export function resetUser(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    clearTimersForUser(uid);

    [
      userSessions,
      userOrders,
      userMessages,
      userWallets,
      failedAttempts,
      antiSpam,
      bannedUntil,
      antiFlood
    ].forEach(store => {
      if (uid in store) delete store[uid];
    });

    activeUsers.remove?.(uid);
    logAction("🧼 [resetUser]", "All state fully cleared", uid);
  } catch (err) {
    logError("❌ [resetUser error]", err, uid);
  }
}

/**
 * 🧹 Clear only volatile activity: messages, spam, bans (preserve session + orders)
 */
export function clearUserActivity(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    delete userMessages[uid];
    delete failedAttempts[uid];
    delete antiSpam[uid];
    delete bannedUntil[uid];
    delete antiFlood[uid];

    activeUsers.remove?.(uid);
    logAction("🧹 [clearUserActivity]", "Volatile state cleared", uid);
  } catch (err) {
    logError("❌ [clearUserActivity error]", err, uid);
  }
}

/**
 * 🗑️ Only clear tracked messages
 */
export function clearUserMessages(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    delete userMessages[uid];
    logAction("🗑️ [clearUserMessages]", "Messages cleared", uid);
  } catch (err) {
    logError("❌ [clearUserMessages error]", err, uid);
  }
}

/**
 * ⏱️ Clear all timers + cleanupScheduled flag
 */
export function clearTimers(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    clearTimersForUser(uid);
    if (userSessions[uid]?.cleanupScheduled) {
      delete userSessions[uid].cleanupScheduled;
      logAction("🧽 [clearTimers]", "Cleanup flag removed", uid);
    }
  } catch (err) {
    logError("❌ [clearTimers error]", err, uid);
  }
}

/**
 * 🚫 Fully remove user from system: reset all state
 */
export function unregisterUser(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    clearUserMessages(uid);
    resetUser(uid);
    logAction("🚫 [unregisterUser]", "User unregistered", uid);
  } catch (err) {
    logError("❌ [unregisterUser error]", err, uid);
  }
}

/**
 * 🛡️ Check if user is currently registered (has session)
 */
export function isUserRegistered(id) {
  const uid = sanitizeId(id);
  const registered = uid && userSessions?.[uid];
  logAction("🛡️ [isUserRegistered]", registered ? "✅ Registered" : "❌ Not registered", uid);
  return !!registered;
}

// ——— Helpers ———

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logAction(label, msg, uid = "") {
  console.log(`${new Date().toISOString()} ${label} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}

function logError(label, err, uid = "") {
  const m = err?.message || err;
  console.error(`${new Date().toISOString()} ${label} → ${m}${uid ? ` (UID: ${uid})` : ""}`);
}
