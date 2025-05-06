// 📦 state/stateManager.js | BalticPharma V2 — IMMORTAL v2025.6 DIAMOND ENGINE FINAL LOCK

import {
  userSessions,
  userOrders,
  userMessages,
  activeTimers,
  paymentTimers,
  failedAttempts,
  antiSpam,
  bannedUntil,
  antiFlood,
  activeUsers
} from "./userState.js";

/**
 * ✅ Pilnas naudotojo duomenų ir laikmačių išvalymas
 */
export function resetUser(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    clearTimers(uid);

    const stores = [
      userSessions,
      userOrders,
      userMessages,
      activeTimers,
      paymentTimers,
      failedAttempts,
      antiSpam,
      bannedUntil,
      antiFlood
    ];

    for (const store of stores) {
      if (store?.[uid] !== undefined) delete store[uid];
    }

    activeUsers.remove(uid);
    console.log(`🧼 Vartotojo ${uid} pilna būsena išvalyta.`);
  } catch (err) {
    console.error("❌ [resetUser klaida]:", err.message);
  }
}

/**
 * ✅ Išvalo veiklos logiką (spam, flood, žinutės), bet palieka sesiją
 */
export function clearUserActivity(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    delete userMessages[uid];
    delete failedAttempts[uid];
    delete antiSpam[uid];
    delete antiFlood[uid];

    activeUsers.remove(uid);
    console.log(`🧹 Išvalyta veikla (be sesijos): ${uid}`);
  } catch (err) {
    console.error("❌ [clearUserActivity klaida]:", err.message);
  }
}

/**
 * ✅ Išvalo tik naudotojo žinučių ID sąrašą (naudojama autodelete logic)
 */
export function clearUserMessages(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    delete userMessages[uid];
  } catch (err) {
    console.error("❌ [clearUserMessages klaida]:", err.message);
  }
}

/**
 * ✅ Išvalo naudotojo pristatymo ir mokėjimo laikmačius
 */
export function clearTimers(id) {
  const uid = safeId(id);
  if (!uid) return;

  try {
    if (activeTimers?.[uid]) {
      clearTimeout(activeTimers[uid]);
      delete activeTimers[uid];
      console.log(`🕒 ⛔️ Pristatymo laikmatis išvalytas: ${uid}`);
    }

    if (paymentTimers?.[uid]) {
      clearTimeout(paymentTimers[uid]);
      delete paymentTimers[uid];
      console.log(`💳 ⛔️ Mokėjimo laikmatis išvalytas: ${uid}`);
    }

    if (userSessions?.[uid]?.cleanupScheduled) {
      delete userSessions[uid].cleanupScheduled;
      console.log(`🧼 cleanupScheduled flag'as pašalintas: ${uid}`);
    }
  } catch (err) {
    console.error("❌ [clearTimers klaida]:", err.message);
  }
}

/**
 * ✅ Visiškas vartotojo pašalinimas iš visos sistemos
 */
export function unregisterUser(id) {
  try {
    const uid = safeId(id);
    if (!uid) return;

    clearTimers(uid);
    clearUserMessages(uid);
    resetUser(uid);
  } catch (err) {
    console.error("❌ [unregisterUser klaida]:", err.message);
  }
}

/**
 * ✅ Užtikrina, kad ID visada yra saugus ir string tipo
 */
function safeId(id) {
  const uid = String(id || "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}
