// 📦 state/timers.js | FINAL IMMORTAL v1.0.0•GODMODE DIAMONDLOCK
// MAXIMUM OPTIMIZATION • ZERO ERROR TOLERANCE • AUTO-CLEANUP • MULTI-TIMER SUPPORT

import { activeTimers, paymentTimers } from "./userState.js";

/**
 * ✅ Sets or replaces an active timer for a user, auto-clearing any previous one
 * @param {string|number} id      - User ID
 * @param {NodeJS.Timeout|number} timerId - Timer reference returned by setTimeout
 */
export function setActiveTimer(id, timerId) {
  const uid = sanitizeId(id);
  if (!uid) {
    logError("🕒 [setActiveTimer]", "Invalid user ID", id);
    return;
  }
  if (!isValidTimer(timerId)) {
    logError("🕒 [setActiveTimer]", "Invalid timer reference", uid);
    return;
  }
  // clear any existing active timer
  if (activeTimers[uid]) {
    clearTimer(activeTimers[uid], uid, "active");
  }
  activeTimers[uid] = timerId;
  logAction("🕒 [setActiveTimer]", "Active timer set", uid);
}

/**
 * ✅ Sets or replaces a payment timer for a user, auto-clearing any previous one
 * @param {string|number} id
 * @param {NodeJS.Timeout|number} timerId
 */
export function setPaymentTimer(id, timerId) {
  const uid = sanitizeId(id);
  if (!uid) {
    logError("💳 [setPaymentTimer]", "Invalid user ID", id);
    return;
  }
  if (!isValidTimer(timerId)) {
    logError("💳 [setPaymentTimer]", "Invalid timer reference", uid);
    return;
  }
  if (paymentTimers[uid]) {
    clearTimer(paymentTimers[uid], uid, "payment");
  }
  paymentTimers[uid] = timerId;
  logAction("💳 [setPaymentTimer]", "Payment timer set", uid);
}

/**
 * ✅ Clears all timers for all users (both active and payment)
 */
export function clearAllTimers() {
  try {
    for (const [uid, timer] of Object.entries(activeTimers)) {
      clearTimer(timer, uid, "active");
    }
    for (const [uid, timer] of Object.entries(paymentTimers)) {
      clearTimer(timer, uid, "payment");
    }
    logAction("🧨 [clearAllTimers]", "All timers cleared");
  } catch (err) {
    logError("❌ [clearAllTimers error]", err);
  }
}

/**
 * ✅ Clears both active and payment timers for a specific user
 * @param {string|number} id
 */
export function clearTimersForUser(id) {
  const uid = sanitizeId(id);
  if (!uid) {
    logError("❌ [clearTimersForUser]", "Invalid user ID", id);
    return;
  }
  try {
    if (activeTimers[uid]) {
      clearTimer(activeTimers[uid], uid, "active");
    }
    if (paymentTimers[uid]) {
      clearTimer(paymentTimers[uid], uid, "payment");
    }
    logAction("🕒 [clearTimersForUser]", "User timers cleared", uid);
  } catch (err) {
    logError("❌ [clearTimersForUser error]", err, uid);
  }
}

/**
 * 🧪 Prints a summary of all active and payment timers to console
 */
export function printTimersSummary() {
  const activeCount  = Object.keys(activeTimers).length;
  const paymentCount = Object.keys(paymentTimers).length;
  logAction(
    "📊 [printTimersSummary]",
    `Active timers: ${activeCount}, Payment timers: ${paymentCount}`
  );
  for (const [uid, timer] of Object.entries(activeTimers)) {
    console.log(`🕒 Active Timer → UID=${uid}, Timer=${timer}`);
  }
  for (const [uid, timer] of Object.entries(paymentTimers)) {
    console.log(`💳 Payment Timer → UID=${uid}, Timer=${timer}`);
  }
}

// ————— HELPERS —————

/**
 * ✅ Validates that the timer reference is something clearTimeout can handle
 */
function isValidTimer(timer) {
  return (
    timer != null &&
    (typeof timer === "number" ||
      (typeof timer === "object" && typeof timer.ref === "function"))
  );
}

/**
 * 🔒 Sanitizes incoming IDs to non-empty strings
 */
function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

/**
 * ✅ Clears a single timer and removes it from its store
 */
function clearTimer(timer, uid, type) {
  if (!isValidTimer(timer)) {
    logError("❌ [clearTimer]", `Invalid ${type} timer`, uid);
    return;
  }
  clearTimeout(timer);
  if (type === "active") delete activeTimers[uid];
  if (type === "payment") delete paymentTimers[uid];
  logAction("🕒 [clearTimer]", `${type} timer cleared`, uid);
}

/**
 * 📋 Logs successful actions
 */
function logAction(action, message, uid = "") {
  console.log(
    `${new Date().toISOString()} ${action} → ${message}${
      uid ? ` (UID: ${uid})` : ""
    }`
  );
}

/**
 * ⚠️ Logs errors
 */
function logError(action, error, uid = "") {
  const msg = error?.message || error;
  console.error(
    `${new Date().toISOString()} ${action} → ${msg}${
      uid ? ` (UID: ${uid})` : ""
    }`
  );
}
