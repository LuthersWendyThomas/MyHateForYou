// 📦 state/timers.js | FINAL IMMORTAL v999999999.9999 — BULLETPROOF SYNC CORE

export const activeTimers = {};     // { userId: Timeout } – delivery, cleanup, etc.
export const paymentTimers = {};    // { userId: Timeout } – payment step (8)

/**
 * ✅ Assigns active UI/delivery timer with auto-clear
 */
export function setActiveTimer(id, timerId) {
  const uid = safeId(id);
  if (!uid || !isValidTimer(timerId)) {
    logError("🕒 [setActiveTimer error]", `Invalid ID or Timer`, uid);
    return;
  }

  try {
    if (activeTimers[uid]) {
      clearTimeout(activeTimers[uid]);
      logAction("🕒 [setActiveTimer]", `Previous timer cleared`, uid);
    }
    activeTimers[uid] = timerId;

    logAction("🕒 [setActiveTimer]", `Timer set`, uid);
  } catch (err) {
    logError("❌ [setActiveTimer error]", err, uid);
  }
}

/**
 * ✅ Assigns payment confirmation timer
 */
export function setPaymentTimer(id, timerId) {
  const uid = safeId(id);
  if (!uid || !isValidTimer(timerId)) {
    logError("💳 [setPaymentTimer error]", `Invalid ID or Timer`, uid);
    return;
  }

  try {
    if (paymentTimers[uid]) {
      clearTimeout(paymentTimers[uid]);
      logAction("💳 [setPaymentTimer]", `Previous payment timer cleared`, uid);
    }
    paymentTimers[uid] = timerId;

    logAction("💳 [setPaymentTimer]", `Payment timer set`, uid);
  } catch (err) {
    logError("❌ [setPaymentTimer error]", err, uid);
  }
}

/**
 * ✅ Clears *ALL* system timers (for restart/reset)
 */
export function clearAllTimers() {
  try {
    for (const [uid, timer] of Object.entries(activeTimers)) {
      clearTimer(timer, uid, "active");
    }

    for (const [uid, timer] of Object.entries(paymentTimers)) {
      clearTimer(timer, uid, "payment");
    }

    logAction("🧨 [clearAllTimers]", `All timers cleared (UI + Payment)`);
  } catch (err) {
    logError("❌ [clearAllTimers error]", err);
  }
}

/**
 * ✅ Clears all timers for a specific user
 */
export function clearTimersForUser(id) {
  const uid = safeId(id);
  if (!uid) {
    logError("❌ [clearTimersForUser error]", `Invalid User ID`, id);
    return;
  }

  try {
    if (activeTimers[uid]) {
      clearTimer(activeTimers[uid], uid, "active");
    }

    if (paymentTimers[uid]) {
      clearTimer(paymentTimers[uid], uid, "payment");
    }

    logAction("🕒 [clearTimersForUser]", `All timers cleared`, uid);
  } catch (err) {
    logError("❌ [clearTimersForUser error]", err, uid);
  }
}

// ————— HELPERS —————

/**
 * ✅ Checks if a timer is valid
 */
function isValidTimer(timer) {
  return timer && typeof timer._onTimeout === "function";
}

/**
 * ✅ Sanitizes user ID
 */
function safeId(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}

/**
 * ✅ Clears a specific timer
 */
function clearTimer(timer, uid, type) {
  if (isValidTimer(timer)) {
    clearTimeout(timer);
    if (type === "active") delete activeTimers[uid];
    if (type === "payment") delete paymentTimers[uid];
    logAction(`🕒 [clearTimer]`, `${type} timer cleared`, uid);
  }
}

/**
 * 📝 Logs successful actions
 */
function logAction(action, message, uid = null) {
  console.log(`${new Date().toISOString()} ${action} → ${message}${uid ? `: ${uid}` : ""}`);
}

/**
 * ⚠️ Logs errors
 */
function logError(action, error, uid = null) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (uid: ${uid})` : ""}`);
}
