// 🛡️ core/security.js | IMMORTAL FINAL v1.0.3•GODMODE DIAMONDLOCK
// TITANLOCK SYNCED • BULLETPROOF • ULTRA-SAFE • AUTO-MUTE/FLOOD-PROOF

import { isBanned } from "../utils/bans.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { antiSpam, antiFlood, bannedUntil, userSessions } from "../state/userState.js";
import { MENU_BUTTONS } from "../helpers/keyboardConstants.js";
import { BOT } from "../config/config.js";

// ⛔ Security thresholds (relaxed +40%)
const SPAM_INTERVAL_MS      = Math.ceil(3_300 * 1.4);     // ~4620ms between messages
const FLOOD_LIMIT           = 6;                         // max actions per window
const FLOOD_WINDOW_MS       = Math.ceil(11_000 * 1.4);    // ~15400ms flood window
const TEMP_MUTE_MS          = 4 * 60_000;                // 4-minute mute
const MAX_MESSAGE_LENGTH    = 600;                       // max characters
const MAX_INPUT_FREQUENCY   = 6;                         // identical repeats before block
const MAX_DISTINCT_INPUTS   = 20;                        // history size

// 🧠 Tracks recent inputs per user
const recentTexts = new Map();

// ✅ Precomputed list of all button texts (lowercased)
const BUTTON_TEXTS = Object.values(MENU_BUTTONS)
  .map(btn => String(btn.text || "").trim().toLowerCase())
  .filter(Boolean);

// ————— Helpers —————

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logAction(action, message, uid = "") {
  console.log(`${new Date().toISOString()} ${action} → ${message}${uid ? ` (UID: ${uid})` : ""}`);
}

function logError(action, error, uid = "") {
  const msg = error?.message || error;
  console.error(`${new Date().toISOString()} ${action} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}

function isAdmin(uid) {
  return String(uid) === String(BOT.ADMIN_ID);
}

// ————— Spam / Flood / Danger checks —————

export function isSpamming(id) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  const now  = Date.now();
  const last = antiSpam[uid] || 0;
  antiSpam[uid] = now;

  const spam = now - last < SPAM_INTERVAL_MS;
  if (spam) logAction("⚠️ [isSpamming]", "Rapid messages detected", uid);
  return spam;
}

export async function handleFlood(id, bot) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  try {
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
        logAction("⛔ [handleFlood]", "Flood detected → muted", uid);
        return true;
      }
    } else {
      antiFlood[uid] = { count: 1, start: now };
    }
    return false;
  } catch (err) {
    logError("❌ [handleFlood error]", err, uid);
    return false;
  }
}

export function isMuted(id) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  const until = bannedUntil[uid];
  if (!until) return false;

  const muted = Date.now() < until;
  if (!muted) delete bannedUntil[uid];
  if (muted) logAction("🔇 [isMuted]", "User is muted", uid);
  return muted;
}

function isMessageDangerous(id, rawText) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  try {
    const txt = String(rawText ?? "").trim();
    if (!txt || txt.length > MAX_MESSAGE_LENGTH) {
      logAction("⚠️ [isMessageDangerous]", "Empty or too long message", uid);
      return true;
    }

    let history = recentTexts.get(uid) || [];
    if (history.length >= MAX_DISTINCT_INPUTS) history.shift();
    history.push(txt);
    recentTexts.set(uid, history);

    const repeats = history.filter(t => t === txt).length;
    if (repeats >= MAX_INPUT_FREQUENCY) {
      logAction("⚠️ [isMessageDangerous]", "Repeated message spam", uid);
      return true;
    }
    return false;
  } catch (err) {
    logError("❌ [isMessageDangerous error]", err, uid);
    return true;
  }
}

// ————— Master gatekeeper —————

export async function canProceed(id, bot, text = "") {
  const uid = sanitizeId(id);
  if (!uid) return false;
  if (isAdmin(uid)) return true;

  const session = userSessions[uid];
  const txt     = String(text ?? "").trim().toLowerCase();

  // 1) If this is *any* button text → always allow immediately
  if (BUTTON_TEXTS.includes(txt)) {
    return true;
  }

  // 2) Allow Confirm/Cancel even if rapid
  if (session?.step >= 8) {
    if (
      txt === MENU_BUTTONS.CONFIRM.text.toLowerCase() ||
      txt === MENU_BUTTONS.CANCEL.text.toLowerCase()
    ) {
      return true;
    }
  }

  try {
    if (isMuted(uid))                   return false;
    if (await handleFlood(uid, bot))    return false;
    if (isSpamming(uid))                return false;
    if (isMessageDangerous(uid, text))  return false;
    if (await isBanned(uid)) {
      logAction("⛔ [canProceed]", "User is permanently banned", uid);
      return false;
    }
    return true;
  } catch (err) {
    logError("❌ [canProceed error]", err, uid);
    return false;
  }
}

async function notifyUserMuted(bot, id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  try {
    await sendAndTrack(
      bot,
      uid,
      "⛔ *Too many requests!* You’ve been muted for *4 minutes*.",
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    logError("❌ [notifyUserMuted error]", err, uid);
  }
}
