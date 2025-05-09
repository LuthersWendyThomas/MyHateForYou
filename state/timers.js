// 📦 state/timers.js | BalticPharma V2 — FINAL v2025.9 ULTRASHIELD READY

/**
 * ⏱️ Active delivery or UI timers
 * Format: { [userId]: Timeout }
 */
export const activeTimers = {};

/**
 * 💳 Payment step (step 8) timers
 * Format: { [userId]: Timeout }
 */
export const paymentTimers = {};

/**
 * ✅ Assigns a UI/delivery timer
 */
export function setActiveTimer(id, timerId) {
  const uid = safeId(id);
  if (!uid || !isValidTimer(timerId)) return;

  activeTimers[uid] = timerId;
  console.log(`🕒 UI timer set for ${uid}`);
}

/**
 * ✅ Assigns a payment timer
 */
export function setPaymentTimer(id, timerId) {
  const uid = safeId(id);
  if (!uid || !isValidTimer(timerId)) return;

  paymentTimers[uid] = timerId;
  console.log(`💳 Payment timer set for ${uid}`);
}

/**
 * ✅ Clears all timers (used during global reset)
 */
export function clearAllTimers() {
  try {
    for (const tid of Object.values(activeTimers)) {
      if (isValidTimer(tid)) clearTimeout(tid);
    }

    for (const tid of Object.values(paymentTimers)) {
      if (isValidTimer(tid)) clearTimeout(tid);
    }

    Object.keys(activeTimers).forEach(id => delete activeTimers[id]);
    Object.keys(paymentTimers).forEach(id => delete paymentTimers[id]);

    console.log("🧨 All timers cleared (UI + payments)");
  } catch (err) {
    console.error("❌ [clearAllTimers error]:", err.message || err);
  }
}

/**
 * ✅ Checks if value is a valid Timeout object
 */
function isValidTimer(timer) {
  return timer && typeof timer._onTimeout === "function";
}

/**
 * ✅ Converts ID to safe string or null
 */
function safeId(id) {
  const str = String(id || "").trim();
  return str && str !== "null" && str !== "undefined" ? str : null;
}
