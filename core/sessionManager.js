// 🧠 core/sessionManager.js | BalticPharma V2 — IMMORTAL v2025.6 TITANLOCK SYNC EDITION

import {
  activeTimers,
  paymentTimers,
  userSessions,
  failedAttempts,
  antiFlood,
  antiSpam,
  bannedUntil,
  userMessages,
  userOrders
} from "../state/userState.js";

const lastSeenAt = {};
const STEP_TIMEOUT = 60 * 60 * 1000;         // 1 val.
const DEFAULT_EXPIRE_THRESHOLD = 45 * 60 * 1000; // 45 min

/**
 * ✅ Pažymi vartotoją kaip aktyvų (naudoti vos gauta žinutė)
 */
export const markUserActive = (id) => {
  if (!id) return;
  lastSeenAt[String(id)] = Date.now();
};

/**
 * ✅ Išvalo pristatymo (UI) laikmatį
 */
export const clearUserTimer = (id) => {
  const uid = String(id);
  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    console.log(`🕒 ⛔️ UI laikmatis išvalytas: ${uid}`);
  }
};

/**
 * ✅ Išvalo mokėjimo laikmatį
 */
export const clearPaymentTimer = (id) => {
  const uid = String(id);
  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    console.log(`💳 ⛔️ Mokėjimo laikmatis išvalytas: ${uid}`);
  }
};

/**
 * ✅ Pilnas naudotojo sesijos ir atminties išvalymas
 */
export const resetSession = (id) => {
  const uid = String(id);
  clearUserTimer(uid);
  clearPaymentTimer(uid);

  const stores = [
    userSessions,
    failedAttempts,
    antiFlood,
    antiSpam,
    bannedUntil,
    userMessages,
    userOrders,
    lastSeenAt
  ];

  for (const store of stores) {
    if (store[uid]) delete store[uid];
  }

  console.log(`🧼 ✅ Sesija išvalyta: ${uid}`);
};

/**
 * ⏳ Automatinis senų / užšalusių sesijų išvalymas
 */
export const autoExpireSessions = (threshold = DEFAULT_EXPIRE_THRESHOLD) => {
  const now = Date.now();
  const expired = [];

  for (const [id, last] of Object.entries(lastSeenAt)) {
    const s = userSessions[id];
    const age = now - last;
    const isExpired = age > threshold;
    const isFrozen = s?.step >= 1 && age > STEP_TIMEOUT;

    if (isExpired || isFrozen) expired.push(id);
  }

  for (const id of expired) {
    resetSession(id);
    console.log(`⏳ AUTO-EXPIRE atliktas: ${id}`);
  }
};

/**
 * ✅ Grąžina aktyvių naudotojų kiekį
 */
export const getActiveUsersCount = () => {
  return Object.keys(userSessions).length;
};

/**
 * ✅ Visiškas valymas (pvz. deploy metu)
 */
export const wipeAllSessions = () => {
  for (const id of Object.keys(userSessions)) {
    resetSession(id);
  }
  console.log("🔥 VISOS sesijos išvalytos (wipeAllSessions)");
};

/**
 * ✅ Išvalo nenaudojamus mokėjimo laikmačius (jei ne 8 žingsnyje)
 */
export const cleanStalePaymentTimers = () => {
  for (const id in paymentTimers) {
    const isValid = userSessions[id]?.step === 8;
    if (!isValid) clearPaymentTimer(id);
  }
};

/**
 * ✅ Debug – parodo aktyvius vartotojus ir jų sesijas
 */
export const printSessionSummary = () => {
  const now = Date.now();
  const users = Object.keys(userSessions);
  console.log(`📊 Aktyvūs vartotojai: ${users.length}`);

  for (const id of users) {
    const s = userSessions[id];
    const last = lastSeenAt[id]
      ? `${Math.floor((now - lastSeenAt[id]) / 1000)}s ago`
      : "n/a";

    console.log(`— ${id}: step=${s?.step}, miestas=${s?.city || "?"}, aktyvumas: ${last}`);
  }
};
