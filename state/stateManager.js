// 📦 state/stateManager.js | FINAL IMMORTAL v999999999.999 — CORE SYSTEM LOCK + GODMODE SYNC

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

    delete activeTimers[uid];
    delete paymentTimers[uid];

    activeUsers.remove(uid);

    console.log(`🧼 [resetUser] → State fully cleared: ${uid}`);
  } catch (err) {
    console.error("❌ [resetUser error]:", err.message || err);
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

    console.log(`🧹 [clearUserActivity] → Security flags cleared: ${uid}`);
  } catch (err) {
    console.error("❌ [clearUserActivity error]:", err.message || err);
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
    console.log(`🗑️ [clearUserMessages] → Messages cleared: ${uid}`);
  } catch (err) {
    console.error("❌ [clearUserMessages error]:", err.message || err);
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
 * ✅ Force-destroys all user state — full cleanup
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
 * 🧠 Safe ID sanitizer (null/undefined/empty prevention)
 */
function safeId(id) {
  const str = String(id ?? "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}
