// 📦 state/userState.js | IMMORTAL FINAL v1.1.1•99999999X•DIAMONDLOCK•BULLETPROOF
// MAX-SYNC • FSM-READY • ULTRA-STABLE • CLEANUP SAFE • WALLET+SESSION SAFE • 24/7 IMMORTAL ENGINE

import fs   from "fs";
import path from "path";

// ——— Session Stores ———
export const userSessions  = {};
export const userOrders    = {};
export const userMessages  = {};
export const userWallets   = {}; // ✅ NEW: Wallet tracking (optional)

// ——— Timers ———
export const activeTimers   = {};
export const paymentTimers  = {};

// ——— Security ———
export const failedAttempts = {};
export const bannedUntil    = {};
export const antiSpam       = {};
export const antiFlood      = {};

// ——— Active Users ———
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

// ——— Full Session Wipe ———
export function clearUserSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  clearTimersForUser(uid);
  resetUser(uid);

  delete userSessions[uid];
  delete userOrders[uid];
  delete userWallets[uid]; // ✅ optional wallet cleanup

  logAction("🧼 [clearUserSession]", "Session cleared", uid);
}

// ——— User Reset Helper (for safeStart/fullResetUserState) ———
export function resetUser(uid) {
  [
    failedAttempts,
    bannedUntil,
    antiSpam,
    antiFlood,
    userMessages,
    userWallets
  ].forEach(store => delete store[uid]);

  if (activeUsers.remove) activeUsers.remove(uid);
  else activeUsers.list.delete(uid);

  logAction("♻️ [resetUser]", "User reset complete", uid);
}

// ——— Timer Cleanup ———
export function clearTimersForUser(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
    logAction("🕒 [clearTimers]", "Active cleared", uid);
  }

  if (paymentTimers[uid]) {
    clearTimeout(paymentTimers[uid]);
    delete paymentTimers[uid];
    logAction("💳 [clearTimers]", "Payment cleared", uid);
  }
}

// ——— Session Start ———
export function safeStartSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  userSessions[uid] = { step: 1, createdAt: Date.now() };
  activeUsers.add(uid);
  logAction("✅ [safeStartSession]", "Session started", uid);
}

// ——— Fail Tracking ———
export function trackFailedAttempts(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  failedAttempts[uid] = (failedAttempts[uid] || 0) + 1;
  logAction("⚠️ [trackFailedAttempts]", `Count=${failedAttempts[uid]}`, uid);

  if (failedAttempts[uid] >= 5) {
    bannedUntil[uid] = Date.now() + 15 * 60_000;
    logAction("⛔ [trackFailedAttempts]", "Auto-banned", uid);
  }
}

// ——— Step Validation ———
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

// ——— Export Snapshot ———
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
        wallet:      userWallets[id] ?? null,
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

// ——— Helpers ———
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
