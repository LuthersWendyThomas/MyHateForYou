// 🛡️ core/security.js | FINAL IMMORTAL v2.0.0•999999999X•DIAMONDLOCK•FULLSYNC
// BULLETPROOF UX • FSM-SAFE • BUTTON-FRIENDLY • FLOOD+SPAM+BAN ENGINE

import { isBanned } from "../utils/bans.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { antiSpam, antiFlood, bannedUntil, userSessions } from "../state/userState.js";
import { MENU_BUTTONS } from "../helpers/keyboardConstants.js";
import { BOT } from "../config/config.js";

// ⏱️ Limits
const SPAM_INTERVAL_MS    = 1400;
const FLOOD_LIMIT         = 9;
const FLOOD_WINDOW_MS     = 9000;
const TEMP_MUTE_MS        = 90 * 1000;
const MAX_MESSAGE_LENGTH  = 600;
const MAX_INPUT_FREQUENCY = 6;
const MAX_DISTINCT_INPUTS = 20;

// ✅ Cache button texts
const BUTTON_TEXTS = Object.values(MENU_BUTTONS)
  .map(btn => String(btn?.text || "").trim().toLowerCase())
  .filter(Boolean);

// 🧠 Recent inputs per user
const recentTexts = new Map();

// ——— Main FSM-Aware Filter ———

export async function canProceed(id, bot, text = "") {
  const uid = sanitizeId(id);
  if (!uid) return false;
  if (isAdmin(uid)) return true;

  const session = userSessions[uid];
  const input = String(text || "").trim().toLowerCase();

  // ✅ Always allow known buttons
  if (BUTTON_TEXTS.includes(input)) return true;

  // ✅ Allow confirm/cancel during steps 8–9
  if (session?.step >= 8) {
    if (
      input === MENU_BUTTONS.CONFIRM.text.toLowerCase() ||
      input === MENU_BUTTONS.CANCEL.text.toLowerCase()
    ) return true;
  }

  try {
    if (isMuted(uid))                   return false;
    if (await handleFlood(uid, bot))   return false;
    if (isSpamming(uid))               return false;
    if (isMessageDangerous(uid, text)) return false;
    if (await isBanned(uid)) {
      logAction("⛔ [canProceed]", "User permanently banned", uid);
      return false;
    }
    return true;
  } catch (err) {
    logError("❌ [canProceed error]", err, uid);
    return false;
  }
}

// ——— Flood Detection ———

export async function handleFlood(id, bot) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  const now = Date.now();
  let state = antiFlood[uid];

  if (!state) {
    antiFlood[uid] = { count: 1, start: now };
    return false;
  }

  if (now - state.start <= FLOOD_WINDOW_MS) {
    state.count++;
    if (state.count > FLOOD_LIMIT) {
      bannedUntil[uid] = now + TEMP_MUTE_MS;
      delete antiFlood[uid];
      await notifyUserMuted(bot, uid);
      logAction("⛔ [handleFlood]", "Flood → muted", uid);
      return true;
    }
  } else {
    antiFlood[uid] = { count: 1, start: now };
  }

  return false;
}

// ——— Spam Detection ———

export function isSpamming(id) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  const now  = Date.now();
  const last = antiSpam[uid] || 0;
  antiSpam[uid] = now;

  const tooFast = now - last < SPAM_INTERVAL_MS;
  if (tooFast) logAction("⚠️ [isSpamming]", "Too rapid", uid);
  return tooFast;
}

// ——— Dangerous Input (length + repetition) ———

function isMessageDangerous(id, rawText) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  const text = String(rawText || "").trim();
  if (!text || text.length > MAX_MESSAGE_LENGTH) {
    logAction("⚠️ [isDangerous]", "Empty or too long", uid);
    return true;
  }

  let history = recentTexts.get(uid) || [];
  if (!Array.isArray(history)) history = [];

  if (history.length >= MAX_DISTINCT_INPUTS) history.shift();
  history.push(text);
  recentTexts.set(uid, history);

  const sameCount = history.filter(t => t === text).length;
  if (sameCount >= MAX_INPUT_FREQUENCY) {
    logAction("⚠️ [isDangerous]", "Repeated spam", uid);
    return true;
  }

  return false;
}

// ——— Mute Status ———

export function isMuted(id) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  const until = bannedUntil[uid];
  if (!until) return false;

  const muted = Date.now() < until;
  if (!muted) {
    delete bannedUntil[uid];
    recentTexts.delete(uid);
  }

  if (muted) logAction("🔇 [isMuted]", "User muted", uid);
  return muted;
}

// ——— Mute Notification ———

async function notifyUserMuted(bot, uid) {
  try {
    const session = userSessions[uid];
    if (!session?.mutedNotified) {
      await sendAndTrack(bot, uid,
        "⛔ *Too many requests!*\nYou've been temporarily *muted for 1.5 minutes*.",
        { parse_mode: "Markdown" }
      );
      if (session) session.mutedNotified = true;
    }
  } catch (err) {
    logError("❌ [notifyUserMuted]", err, uid);
  }
}

// ——— Helpers ———

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function isAdmin(uid) {
  return String(uid) === String(BOT.ADMIN_ID);
}

function logAction(label, msg, uid = "") {
  console.log(`${new Date().toISOString()} ${label} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}

function logError(label, err, uid = "") {
  const msg = err?.message || err;
  console.error(`${new Date().toISOString()} ${label} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}
