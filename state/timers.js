// 📦 state/timers.js | IMMORTAL FINAL v2.0.0•9999999999X•SYNCED•DIAMONDLOCK
// MAX SAFETY • BULLETPROOF TIMERS • FULL PAYMENT INTEGRATION • LIVE LOGGING • ZERO LEAKS

import { activeTimers, paymentTimers } from "./userState.js";

/**
 * ✅ Set or replace active timer for user
 */
export function setActiveTimer(id, timer) {
  const uid = sanitizeId(id);
  if (!uid) return logError("🕒 [setActiveTimer]", "Invalid user ID", id);
  if (!isValidTimer(timer)) return logError("🕒 [setActiveTimer]", "Invalid timer instance", uid);

  if (activeTimers[uid]) clearSingleTimer(activeTimers[uid], uid, "active");
  activeTimers[uid] = timer;
  logAction("🕒 [setActiveTimer]", "Active timer set", uid);
}

/**
 * ✅ Set or replace payment timer for user
 */
export function setPaymentTimer(id, timer) {
  const uid = sanitizeId(id);
  if (!uid) return logError("💳 [setPaymentTimer]", "Invalid user ID", id);
  if (!isValidTimer(timer)) return logError("💳 [setPaymentTimer]", "Invalid timer instance", uid);

  if (paymentTimers[uid]) clearSingleTimer(paymentTimers[uid], uid, "payment");
  paymentTimers[uid] = timer;
  logAction("💳 [setPaymentTimer]", "Payment timer set", uid);
}

/**
 * 🔥 Clear ALL active + payment timers (admin global reset)
 */
export function clearAllTimers() {
  try {
    for (const [uid, timer] of Object.entries(activeTimers)) {
      clearSingleTimer(timer, uid, "active");
    }
    for (const [uid, timer] of Object.entries(paymentTimers)) {
      clearSingleTimer(timer, uid, "payment");
    }
    logAction("🧨 [clearAllTimers]", "All timers cleared globally");
  } catch (err) {
    logError("❌ [clearAllTimers error]", err);
  }
}

/**
 * 🧼 Clear both timers for specific user
 */
export function clearTimersForUser(id) {
  const uid = sanitizeId(id);
  if (!uid) return logError("❌ [clearTimersForUser]", "Invalid user ID", id);

  try {
    if (activeTimers[uid]) clearSingleTimer(activeTimers[uid], uid, "active");
    if (paymentTimers[uid]) clearSingleTimer(paymentTimers[uid], uid, "payment");
    logAction("🧼 [clearTimersForUser]", "User timers cleared", uid);
  } catch (err) {
    logError("❌ [clearTimersForUser error]", err, uid);
  }
}

/**
 * 📊 Timer summary (active + payment)
 */
export function printTimersSummary() {
  const activeCount  = Object.keys(activeTimers).length;
  const paymentCount = Object.keys(paymentTimers).length;

  logAction("📊 [printTimersSummary]", `Active=${activeCount}, Payment=${paymentCount}`);

  for (const [uid, timer] of Object.entries(activeTimers)) {
    console.log(`🕒 Active → UID=${uid} | TimerRef=${timer?.[Symbol.toPrimitive]?.() || "?"}`);
  }
  for (const [uid, timer] of Object.entries(paymentTimers)) {
    console.log(`💳 Payment → UID=${uid} | TimerRef=${timer?.[Symbol.toPrimitive]?.() || "?"}`);
  }
}

// ——— Internal Helpers ———

function clearSingleTimer(timer, uid, type) {
  try {
    clearTimeout(timer);
    if (type === "active") delete activeTimers[uid];
    if (type === "payment") delete paymentTimers[uid];
    logAction("🧹 [clearSingleTimer]", `${type} timer cleared`, uid);
  } catch (err) {
    logError("❌ [clearSingleTimer error]", err, uid);
  }
}

function isValidTimer(timer) {
  return timer && typeof timer._onTimeout === "function";
}

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logAction(label, msg, uid = "") {
  console.log(`${new Date().toISOString()} ${label} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}

function logError(label, err, uid = "") {
  const msg = err?.message || err;
  console.error(`${new Date().toISOString()} ${label} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}
