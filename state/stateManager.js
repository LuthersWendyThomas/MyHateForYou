// 📦 state/stateManager.js | IMMORTAL FINAL v2.0.1•999999999999X•DIAMONDLOCK•SYNCED•BULLETPROOF
// MAX-STABILITY • FSM/QRCODE/PAYMENT SAFE • SESSION IMMORTALITY • ZERO LEAKS • PERFECT SYNC

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
 * 🧼 Full reset: session, wallet, timers, messages, flags
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

    if (userSessions[uid]?.qrFallbackUsed) delete userSessions[uid].qrFallbackUsed;

    activeUsers.remove?.(uid);
    logAction("🧼 [resetUser]", "All state fully cleared", uid);
  } catch (err) {
    logError("❌ [resetUser error]", err, uid);
  }
}

/**
 * 🧹 Clear only volatile activity: messages, spam, bans
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
 * ⏱️ Clear all timers + cleanupScheduled + qrFallbackUsed
 */
export function clearTimers(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    clearTimersForUser(uid);

    const session = userSessions[uid];
    if (session?.cleanupScheduled) delete session.cleanupScheduled;
    if (session?.qrFallbackUsed) delete session.qrFallbackUsed;

    logAction("🧽 [clearTimers]", "Timers and flags cleared", uid);
  } catch (err) {
    logError("❌ [clearTimers error]", err, uid);
  }
}

/**
 * 🚫 Fully remove user from system
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
 * 🛡️ Check if user is registered (has session)
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
