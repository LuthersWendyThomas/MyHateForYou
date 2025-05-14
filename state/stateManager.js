// 📦 state/stateManager.js | IMMORTAL FINAL v1.1.1•999999999X•GODMODE•DIAMONDLOCK+SYNC
// FULL WALLET SUPPORT • FSM SAFE • CLEANUP RESILIENT • 24/7 BULLETPROOF ENGINE

import {
  userSessions,
  userOrders,
  userMessages,
  userWallets, // ✅ NEW
  activeTimers,
  paymentTimers,
  failedAttempts,
  antiSpam,
  bannedUntil,
  antiFlood,
  activeUsers
} from "./userState.js";

/**
 * 🧼 Full user reset: session + flags + messages + timers + orders + wallets
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
      userWallets, // ✅ also clear wallets
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
 * 🧹 Clear volatile activity (flags/messages only — preserves session/orders)
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
 * 🗑️ Clear tracked messages only
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
 * ⏱️ Clear all timers (active/payment) + cleanupScheduled flag
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
      logAction("🧽 [clearTimers]", "Cleanup flag removed", uid);
    }
  } catch (err) {
    logError("❌ [clearTimers error]", err, uid);
  }
}

/**
 * 🚫 Fully unregister user — full wipe incl. orders + wallets
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
 * 🛡️ Check if user has an active session
 */
export function isUserRegistered(id) {
  const uid = sanitizeId(id);
  const registered = uid && userSessions?.[uid];
  logAction("🛡️ [isUserRegistered]", registered ? "✅ Registered" : "❌ Not registered", uid);
  return !!registered;
}

// ————— Helpers —————

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
