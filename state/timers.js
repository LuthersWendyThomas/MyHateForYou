// 📦 state/timers.js | FINAL IMMORTAL v999999999.999 — BULLETPROOF SYNC CORE

export const activeTimers = {};     // { userId: Timeout } – delivery, cleanup, etc.
export const paymentTimers = {};    // { userId: Timeout } – payment step (8)

/**
 * ✅ Assigns active UI/delivery timer with auto-clear
 */
export function setActiveTimer(id, timerId) {
  const uid = safeId(id);
  if (!uid || !isValidTimer(timerId)) return;

  if (activeTimers[uid]) clearTimeout(activeTimers[uid]);
  activeTimers[uid] = timerId;

  if (process.env.DEBUG_TIMERS === "true") {
    console.log(`🕒 [setActiveTimer] → ${uid}`);
  }
}

/**
 * ✅ Assigns payment confirmation timer
 */
export function setPaymentTimer(id, timerId) {
  const uid = safeId(id);
  if (!uid || !isValidTimer(timerId)) return;

  if (paymentTimers[uid]) clearTimeout(paymentTimers[uid]);
  paymentTimers[uid] = timerId;

  if (process.env.DEBUG_TIMERS === "true") {
    console.log(`💳 [setPaymentTimer] → ${uid}`);
  }
}

/**
 * ✅ Clears *ALL* system timers (for restart/reset)
 */
export function clearAllTimers() {
  try {
    for (const [uid, timer] of Object.entries(activeTimers)) {
      if (isValidTimer(timer)) clearTimeout(timer);
      delete activeTimers[uid];
    }

    for (const [uid, timer] of Object.entries(paymentTimers)) {
      if (isValidTimer(timer)) clearTimeout(timer);
      delete paymentTimers[uid];
    }

    console.log("🧨 [clearAllTimers] → All timers cleared (UI + payment)");
  } catch (err) {
    console.error("❌ [clearAllTimers error]:", err.message || err);
  }
}

/**
 * ✅ Clears all timers for a specific user
 */
export function clearTimersForUser(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    if (activeTimers[uid]) {
      clearTimeout(activeTimers[uid]);
      delete activeTimers[uid];
      console.log(`🕒 [clearTimersForUser] UI timer cleared → ${uid}`);
    }

    if (paymentTimers[uid]) {
      clearTimeout(paymentTimers[uid]);
      delete paymentTimers[uid];
      console.log(`💳 [clearTimersForUser] Payment timer cleared → ${uid}`);
    }
  } catch (err) {
    console.error("❌ [clearTimersForUser error]:", err.message || err);
  }
}

// ————— HELPERS —————

function isValidTimer(timer) {
  return timer && typeof timer._onTimeout === "function";
}

function safeId(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}
