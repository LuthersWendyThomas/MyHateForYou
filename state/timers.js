// 📦 state/timers.js | FINAL IMMORTAL v1.0.1•GODMODE DIAMONDLOCK
// MAX OPTIMIZATION • ZERO ERROR TOLERANCE • AUTO-CLEANUP • MULTI-TIMER SUPPORT

import { activeTimers, paymentTimers } from "./userState.js";

/**
 * ✅ Register or replace an "active" timer for a user.
 *    Automatically clears any existing one.
 */
export function setActiveTimer(id, timer) {
  const uid = sanitizeId(id);
  if (!uid) {
    logError("🕒 [setActiveTimer]", "Invalid user ID", id);
    return;
  }
  if (!isValidTimer(timer)) {
    logError("🕒 [setActiveTimer]", "Invalid timer reference", uid);
    return;
  }
  // Clear old
  if (activeTimers[uid]) {
    clearSingleTimer(activeTimers[uid], uid, "active");
  }
  activeTimers[uid] = timer;
  logAction("🕒 [setActiveTimer]", "Active timer set", uid);
}

/**
 * ✅ Register or replace a "payment" timer for a user.
 *    Automatically clears any existing one.
 */
export function setPaymentTimer(id, timer) {
  const uid = sanitizeId(id);
  if (!uid) {
    logError("💳 [setPaymentTimer]", "Invalid user ID", id);
    return;
  }
  if (!isValidTimer(timer)) {
    logError("💳 [setPaymentTimer]", "Invalid timer reference", uid);
    return;
  }
  // Clear old
  if (paymentTimers[uid]) {
    clearSingleTimer(paymentTimers[uid], uid, "payment");
  }
  paymentTimers[uid] = timer;
  logAction("💳 [setPaymentTimer]", "Payment timer set", uid);
}

/**
 * ✅ Clear *all* timers for *all* users (both active & payment)
 */
export function clearAllTimers() {
  try {
    for (const [uid, timer] of Object.entries(activeTimers)) {
      clearSingleTimer(timer, uid, "active");
    }
    for (const [uid, timer] of Object.entries(paymentTimers)) {
      clearSingleTimer(timer, uid, "payment");
    }
    logAction("🧨 [clearAllTimers]", "All timers cleared");
  } catch (err) {
    logError("❌ [clearAllTimers error]", err);
  }
}

/**
 * ✅ Clear both active & payment timers for a given user
 */
export function clearTimersForUser(id) {
  const uid = sanitizeId(id);
  if (!uid) {
    logError("❌ [clearTimersForUser]", "Invalid user ID", id);
    return;
  }
  try {
    if (activeTimers[uid]) {
      clearSingleTimer(activeTimers[uid], uid, "active");
    }
    if (paymentTimers[uid]) {
      clearSingleTimer(paymentTimers[uid], uid, "payment");
    }
    logAction("🕒 [clearTimersForUser]", "User timers cleared", uid);
  } catch (err) {
    logError("❌ [clearTimersForUser error]", err, uid);
  }
}

/**
 * 🧪 Print a summary of all active & payment timers
 */
export function printTimersSummary() {
  const activeCount  = Object.keys(activeTimers).length;
  const paymentCount = Object.keys(paymentTimers).length;
  logAction(
    "📊 [printTimersSummary]",
    `Active: ${activeCount}, Payment: ${paymentCount}`
  );
  for (const [uid, timer] of Object.entries(activeTimers)) {
    console.log(`🕒 Active Timer → UID=${uid}, Timer=${timer}`);
  }
  for (const [uid, timer] of Object.entries(paymentTimers)) {
    console.log(`💳 Payment Timer → UID=${uid}, Timer=${timer}`);
  }
}

// ————— HELPERS —————

/** Validate that a timer reference is a NodeJS Timeout (has _onTimeout) */
function isValidTimer(timer) {
  return timer && typeof timer._onTimeout === "function";
}

/** Clear one timer and remove from its store */
function clearSingleTimer(timer, uid, type) {
  try {
    clearTimeout(timer);
    if (type === "active") delete activeTimers[uid];
    if (type === "payment") delete paymentTimers[uid];
    logAction("🕒 [clearTimer]", `${type} timer cleared`, uid);
  } catch (err) {
    logError("❌ [clearTimer error]", err, uid);
  }
}

/** Sanitize incoming user ID */
function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

/** Log successes */
function logAction(action, message, uid = "") {
  console.log(
    `${new Date().toISOString()} ${action} → ${message}${uid ? ` (UID: ${uid})` : ""}`
  );
}

/** Log errors */
function logError(action, error, uid = "") {
  const msg = error?.message || error;
  console.error(
    `${new Date().toISOString()} ${action} → ${msg}${uid ? ` (UID: ${uid})` : ""}`
  );
}
