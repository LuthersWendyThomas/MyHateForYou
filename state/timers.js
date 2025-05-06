// 📦 state/timers.js | BalticPharma V2 — FINAL v2025.6 TITAN CLOCK SHIELD MIRROR EDITION

/**
 * Active delivery or step timers
 * Format: { [userId]: Timeout }
 */
export const activeTimers = {};

/**
 * Payment step (step 8) timers
 * Format: { [userId]: Timeout }
 */
export const paymentTimers = {};

/**
 * ✅ Assigns a UI (delivery) timer to the user
 * @param {string|number} id - user ID
 * @param {Timeout} timerId - setTimeout returned ID
 */
export function setActiveTimer(id, timerId) {
  const uid = safeId(id);
  if (uid && timerId) {
    activeTimers[uid] = timerId;
    console.log(`🕒 Active timer set for ${uid}`);
  }
}

/**
 * ✅ Assigns a payment step timer to a user
 * @param {string|number} id - user ID
 * @param {Timeout} timerId - setTimeout returned ID
 */
export function setPaymentTimer(id, timerId) {
  const uid = safeId(id);
  if (uid && timerId) {
    paymentTimers[uid] = timerId;
    console.log(`💳 Payment timer set for ${uid}`);
  }
}

/**
 * ✅ Clears all timers (during deployment or force stop)
 */
export function clearAllTimers() {
  try {
    // Clear all active timers for delivery and payment
    for (const t of Object.values(activeTimers)) clearTimeout(t);
    for (const t of Object.values(paymentTimers)) clearTimeout(t);

    // Clean up the timer objects
    Object.keys(activeTimers).forEach((id) => delete activeTimers[id]);
    Object.keys(paymentTimers).forEach((id) => delete paymentTimers[id]);

    console.log("🧨 All timers cleaned (UI + payments).");
  } catch (err) {
    console.error("❌ [clearAllTimers error]:", err.message || err);
  }
}

/**
 * ✅ Safely converts ID to string, used for ID-based storage
 * @param {string|number} id - User ID
 * @returns {string|null} - Safe string ID or null if invalid
 */
function safeId(id) {
  if (id === undefined || id === null) return null;
  return String(id);
}
