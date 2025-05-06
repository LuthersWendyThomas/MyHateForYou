// 📦 state/timers.js | BalticPharma V2 — FINAL v2025.6 TITAN CLOCK SHIELD MIRROR EDITION

/**
 * Aktyvūs pristatymo ar žingsnių laikmačiai
 * Formatas: { [userId]: Timeout }
 */
export const activeTimers = {};

/**
 * Mokėjimo žingsnio (step 8) laikmačiai
 * Formatas: { [userId]: Timeout }
 */
export const paymentTimers = {};

/**
 * ✅ Priskiria UI (pristatymo) laikmatį vartotojui
 * @param {string|number} id - vartotojo ID
 * @param {Timeout} timerId - setTimeout grąžintas ID
 */
export function setActiveTimer(id, timerId) {
  const uid = safeId(id);
  if (uid && timerId) activeTimers[uid] = timerId;
}

/**
 * ✅ Priskiria mokėjimo žingsnio laikmatį vartotojui
 * @param {string|number} id - vartotojo ID
 * @param {Timeout} timerId - setTimeout grąžintas ID
 */
export function setPaymentTimer(id, timerId) {
  const uid = safeId(id);
  if (uid && timerId) paymentTimers[uid] = timerId;
}

/**
 * ✅ Išvalo visus laikmačius (deploy metu arba force stop)
 */
export function clearAllTimers() {
  try {
    for (const t of Object.values(activeTimers)) clearTimeout(t);
    for (const t of Object.values(paymentTimers)) clearTimeout(t);

    Object.keys(activeTimers).forEach((id) => delete activeTimers[id]);
    Object.keys(paymentTimers).forEach((id) => delete paymentTimers[id]);

    console.log("🧨 All timers cleaned (UI + payments).");
  } catch (err) {
    console.error("❌ [clearAllTimers error]:", err.message || err);
  }
}

/**
 * ✅ Saugiai konvertuoja ID į string
 */
function safeId(id) {
  if (id === undefined || id === null) return null;
  return String(id);
}
