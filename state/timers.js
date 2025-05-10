// 📦 state/timers.js | FINAL IMMORTAL v999999999.999 — BULLETPROOF SYNC CORE

export const activeTimers = {};     // { userId: Timeout } – delivery, cleanup, etc.
export const paymentTimers = {};    // { userId: Timeout } – payment step (8)

/**
 * ✅ Assigns UI/delivery timer with auto-clear
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
 * ✅ Assigns payment timer with auto-clear
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
 * ✅ Clears *all* timers globally
 */
export function clearAllTimers() {
  try {
    Object.entries(activeTimers).forEach(([uid, timer]) => {
      if (isValidTimer(timer)) clearTimeout(timer);
      delete activeTimers[uid];
    });

    Object.entries(paymentTimers).forEach(([uid, timer]) => {
      if (isValidTimer(timer)) clearTimeout(timer);
      delete paymentTimers[uid];
    });

    console.log("🧨 [clearAllTimers] → All timers cleared (UI + payment)");
  } catch (err) {
    console.error("❌ [clearAllTimers error]:", err.message || err);
  }
}

/**
 * ✅ Clears timers for specific user
 */
export function clearTimersForUser(id) {
  const uid = safeId(id);
  if (!uid) return;

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
}

// ————— HELPERS —————

function isValidTimer(timer) {
  return timer && typeof timer._onTimeout === "function";
}

function safeId(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}
