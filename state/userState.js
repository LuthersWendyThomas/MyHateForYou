// 📦 state/userState.js | IMMORTAL FINAL v1.0.9•999999X•SYNC•GODMODE
// MAX-SYNC • NO ERROR TOLERANCE • FULL EXPORT • FSM-READY • 24/7 BULLETPROOF

import fs   from "fs";
import path from "path";

// ————————————————
// 🧠 Core session stores
// ————————————————
export const userSessions = {};    // { [userId]: { step, createdAt, ... } }
export const userOrders   = {};    // { [userId]: totalOrders }
export const userMessages = {};    // { [userId]: [msgId, ...] }

// ————————————————
// ⏱ Timer containers
// ————————————————
export const activeTimers  = {};   // { [userId]: Timeout } – delivery/cleanup
export const paymentTimers = {};   // { [userId]: Timeout } – payment expiry

// ————————————————
// 🛡️ Security trackers
// ————————————————
export const failedAttempts = {};  // { [userId]: count }
export const bannedUntil    = {};  // { [userId]: timestamp }
export const antiSpam       = {};  // { [userId]: lastMsgTs }
export const antiFlood      = {};  // { [userId]: { count, startTs } }

// ————————————————
// 👥 Live user registry
// ————————————————
export const activeUsers = {
  list: new Set(),
  get count() {
    return this.list.size;
  },
  add(id) {
    const uid = sanitizeId(id);
    if (uid) this.list.add(uid);
  },
  remove(id) {
    const uid = sanitizeId(id);
    if (uid) this.list.delete(uid);
  },
  has(id) {
    return this.list.has(sanitizeId(id));
  },
  reset() {
    this.list.clear();
  }
};

// ———————————————————————————
// 🔄 Full reset of user session (preserves order history)
// ———————————————————————————
export function clearUserSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  clearTimersForUser(uid);

  [ userSessions, userMessages, failedAttempts, bannedUntil, antiSpam, antiFlood ]
    .forEach(store => { if (uid in store) delete store[uid]; });

  activeUsers.remove(uid);
  logAction("🧼 [clearUserSession]", "Session cleared", uid);
}

// ———————————————————————————
// 🧼 Kill all timers for this user
// ———————————————————————————
export function clearTimersForUser(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    logAction("🕒 [clearTimersForUser]", "Cleared active", uid);
  }
  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    logAction("💳 [clearTimersForUser]", "Cleared payment", uid);
  }
}

// ———————————————————————————
// ✅ Start fresh user session
// ———————————————————————————
export function safeStartSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  userSessions[uid] = { step: 1, createdAt: Date.now() };
  activeUsers.add(uid);
  logAction("✅ [safeStartSession]", "Started session", uid);
}

// ———————————————————————————
// ⚠️ Track failures + auto-ban logic
// ———————————————————————————
export function trackFailedAttempts(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  failedAttempts[uid] = (failedAttempts[uid] || 0) + 1;
  logAction("⚠️ [trackFailedAttempts]", `Count=${failedAttempts[uid]}`, uid);

  if (failedAttempts[uid] >= 5) {
    bannedUntil[uid] = Date.now() + 15 * 60_000; // 15 min
    logAction("⛔ [trackFailedAttempts]", "Auto-banned", uid);
  }
}

// ———————————————————————————
// 🔄 Step validation & sync
// ———————————————————————————
export function verifySessionStep(id) {
  const uid = sanitizeId(id);
  if (!uid) return 1;

  const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
  if (!isValidStep(session.step)) {
    logAction("⚠️ [verifySessionStep]", `Reset step=${session.step}`, uid);
    session.step = 1;
  }
  return session.step;
}

export function isValidStep(step) {
  return typeof step === "number" && step >= 1 && step <= 9;
}

// ———————————————————————————
// 📤 Export full snapshot of user stats
// ———————————————————————————
export function exportUserStats() {
  try {
    const now = new Date();
    const ts  = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const dir = "logs";
    const fp  = path.join(dir, `userStats-${ts}.json`);

    const data = {};
    for (const uid of Object.keys(userSessions)) {
      const id = sanitizeId(uid);
      if (!id) continue;

      const session = userSessions[id] || {};
      data[id] = {
        step:        session.step ?? null,
        city:        session.city ?? null,
        product:     session.product?.name ?? null,
        orders:      userOrders[id] ?? 0,
        bannedUntil: bannedUntil[id] ?? null,
        msgCount:    Array.isArray(userMessages[id]) ? userMessages[id].length : 0
      };
    }

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(data, null, 2));
    logAction("📤 [exportUserStats]", `Exported → ${fp}`);
    return fp;
  } catch (err) {
    logError("❌ [exportUserStats]", err);
    return null;
  }
}

// ———————————————————————————
// 🧩 Internal helpers
// ———————————————————————————
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
