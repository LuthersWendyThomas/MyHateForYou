// 📦 state/timers.js | FINAL IMMORTAL DIAMONDLOCK v999999999.∞ — BULLETPROOF SYNC CORE
// MAXIMUM OPTIMIZATION • ZERO ERROR TOLERANCE • AUTO-CLEANUP • MULTI-TIMER SUPPORT

export const activeTimers = {};     // { userId: Timeout } – delivery, cleanup, etc.
export const paymentTimers = {};    // { userId: Timeout } – payment step (8)

/**
 * ✅ Assigns or updates an active delivery/UI timer with auto-clear
 * @param {string|number} id - User ID
 * @param {Timeout} timerId - Timer reference
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

    logAction("🕒 [setActiveTimer]", `Active timer set`, uid);
  } catch (err) {
    logError("❌ [setActiveTimer error]", err, uid);
  }
}

/**
 * ✅ Assigns or updates a payment confirmation timer
 * @param {string|number} id - User ID
 * @param {Timeout} timerId - Timer reference
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
 * ✅ Clears all system timers across all users
 */
export function clearAllTimers() {
  try {
    for (const [uid, timer] of Object.entries(activeTimers)) {
      clearTimer(timer, uid, "active");
    }

    for (const [uid, timer] of Object.entries(paymentTimers)) {
      clearTimer(timer, uid, "payment");
    }

    logAction("🧨 [clearAllTimers]", `All timers cleared (Active + Payment)`);
  } catch (err) {
    logError("❌ [clearAllTimers error]", err);
  }
}

/**
 * ✅ Clears all timers (active and payment) for a specific user
 * @param {string|number} id - User ID
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

    logAction("🕒 [clearTimersForUser]", `All timers cleared for user`, uid);
  } catch (err) {
    logError("❌ [clearTimersForUser error]", err, uid);
  }
}

/**
 * 🧪 Debugging tool: Prints a summary of all active timers
 */
export function printTimersSummary() {
  const activeCount = Object.keys(activeTimers).length;
  const paymentCount = Object.keys(paymentTimers).length;

  logAction("📊 [printTimersSummary]", `Active timers: ${activeCount}, Payment timers: ${paymentCount}`);

  for (const [uid, timer] of Object.entries(activeTimers)) {
    console.log(`🕒 Active Timer → User: ${uid}, Timer: ${timer}`);
  }

  for (const [uid, timer] of Object.entries(paymentTimers)) {
    console.log(`💳 Payment Timer → User: ${uid}, Timer: ${timer}`);
  }
}

// ————— HELPERS —————

/**
 * ✅ Checks if a timer is valid
 * @param {Timeout} timer - Timer reference
 * @returns {boolean} - True if timer is valid
 */
function isValidTimer(timer) {
  return timer && typeof timer._onTimeout === "function";
}

/**
 * ✅ Safely sanitizes a user ID
 * @param {string|number} id - Input ID
 * @returns {string|null} - Sanitized ID or null
 */
function safeId(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}

/**
 * ✅ Clears a specific timer
 * @param {Timeout} timer - Timer reference
 * @param {string} uid - User ID
 * @param {string} type - Timer type ("active" or "payment")
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
 * @param {string} action - Action description
 * @param {string} message - Additional details
 * @param {string} [uid] - User ID (optional)
 */
function logAction(action, message, uid = null) {
  console.log(`${new Date().toISOString()} ${action} → ${message}${uid ? ` (ID: ${uid})` : ""}`);
}

/**
 * ⚠️ Logs errors
 * @param {string} action - Action description
 * @param {Error|string} error - Error object or message
 * @param {string} [uid] - User ID (optional)
 */
function logError(action, error, uid = null) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${uid ? ` (ID: ${uid})` : ""}`);
}
