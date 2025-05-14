// 📦 state/userState.js | IMMORTAL FINAL v2.0.0•99999999999X•SYNCED•GODMODE
// MAX-ENGINE • SESSION IMMORTALITY • BULLETPROOF SYNC • QR/PAYMENT READY • FLOOD-RESISTANT

import fs from "fs";
import path from "path";

// ——— In-Memory State Stores ———
export const userSessions  = {};
export const userOrders    = {};
export const userMessages  = {};
export const userWallets   = {}; // 💳 Track user wallet address if needed

// ——— Timers ———
export const activeTimers  = {};
export const paymentTimers = {};

// ——— Anti-Spam/Abuse ———
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

// ——— Full Session Reset ———
export function clearUserSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  clearTimersForUser(uid);
  resetUser(uid);

  delete userSessions[uid];
  delete userOrders[uid];
  delete userWallets[uid];

  logAction("🧼 [clearUserSession]", "Session cleared", uid);
}

// ——— Deep User Reset (used in /start or fatal error) ———
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

// ——— Kill Timers (active or payment) ———
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

// ——— Safe Session Starter ———
export function safeStartSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  userSessions[uid] = { step: 1, createdAt: Date.now() };
  activeUsers.add(uid);
  logAction("✅ [safeStartSession]", "Session started", uid);
}

// ——— Fail + Ban Counter ———
export function trackFailedAttempts(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  failedAttempts[uid] = (failedAttempts[uid] || 0) + 1;
  logAction("⚠️ [trackFailedAttempts]", `Count=${failedAttempts[uid]}`, uid);

  if (failedAttempts[uid] >= 5) {
    bannedUntil[uid] = Date.now() + 15 * 60_000; // 15 min ban
    logAction("⛔ [trackFailedAttempts]", "Auto-banned", uid);
  }
}

// ——— Session Step Verifier (used by FSM) ———
export function verifySessionStep(id) {
  const uid = sanitizeId(id);
  if (!uid) return 1;

  const session = userSessions[uid] ||= { step: 1, createdAt: Date.now() };
  if (!isValidStep(session.step)) {
    session.step = 1;
    logAction("⚠️ [verifySessionStep]", "Invalid step reset", uid);
  }
  return session.step;
}

// ——— Valid Steps (FSM step 1–9) ———
export function isValidStep(step) {
  return typeof step === "number" && step >= 1 && step <= 9;
}

// ——— Export Snapshot (JSON dump for admin audit/logs) ———
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
      const s = userSessions[id] || {};

      data[id] = {
        step:        s.step ?? null,
        city:        s.city ?? null,
        product:     s.product?.name ?? null,
        orders:      userOrders[id] ?? 0,
        wallet:      userWallets[id] ?? null,
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
