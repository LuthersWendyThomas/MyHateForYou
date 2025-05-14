// 📦 state/timers.js | IMMORTAL FINAL v1.1.1•99999999X•SYNC•DIAMONDLOCK+SAFESET
// MAX OPTIMIZATION • SAFE SET/RESET • TIMER SUMMARY • FULLY SYNCHRONIZED

import { activeTimers, paymentTimers } from "./userState.js";

/**
 * ✅ Set or replace active timer
 */
export function setActiveTimer(id, timer) {
  const uid = sanitizeId(id);
  if (!uid) return logError("🕒 [setActiveTimer]", "Invalid user ID", id);
  if (!isValidTimer(timer)) return logError("🕒 [setActiveTimer]", "Invalid timer", uid);

  if (activeTimers[uid]) clearSingleTimer(activeTimers[uid], uid, "active");
  activeTimers[uid] = timer;
  logAction("🕒 [setActiveTimer]", "Active timer set", uid);
}

/**
 * ✅ Set or replace payment timer
 */
export function setPaymentTimer(id, timer) {
  const uid = sanitizeId(id);
  if (!uid) return logError("💳 [setPaymentTimer]", "Invalid user ID", id);
  if (!isValidTimer(timer)) return logError("💳 [setPaymentTimer]", "Invalid timer", uid);

  if (paymentTimers[uid]) clearSingleTimer(paymentTimers[uid], uid, "payment");
  paymentTimers[uid] = timer;
  logAction("💳 [setPaymentTimer]", "Payment timer set", uid);
}

/**
 * 🔥 Clear ALL timers (admin/global reset)
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
 * 🧼 Clear all timers for specific user
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
 * 📊 Print live timer summary
 */
export function printTimersSummary() {
  const activeCount  = Object.keys(activeTimers).length;
  const paymentCount = Object.keys(paymentTimers).length;

  logAction("📊 [printTimersSummary]", `Active: ${activeCount}, Payment: ${paymentCount}`);

  for (const [uid, timer] of Object.entries(activeTimers)) {
    console.log(`🕒 Active Timer → UID=${uid}, Ref=${timer}`);
  }
  for (const [uid, timer] of Object.entries(paymentTimers)) {
    console.log(`💳 Payment Timer → UID=${uid}, Ref=${timer}`);
  }
}

// ——— Helpers ———

function isValidTimer(timer) {
  return timer && typeof timer._onTimeout === "function";
}

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

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logAction(action, msg, uid = "") {
  console.log(`${new Date().toISOString()} ${action} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}

function logError(action, err, uid = "") {
  const msg = err?.message || err;
  console.error(`${new Date().toISOString()} ${action} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}
