// 🛡️ core/security.js | IMMORTAL FINAL v1.1.0•999999999x•SYNCED•BULLETPROOF
// PERFECT FLOODHANDLER SYNC • ULTRA-SAFE • FSM-FRIENDLY • UX BOOSTED

import { isBanned } from "../utils/bans.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { antiSpam, antiFlood, bannedUntil, userSessions } from "../state/userState.js";
import { MENU_BUTTONS } from "../helpers/keyboardConstants.js";
import { BOT } from "../config/config.js";

// ⛔ Synced Limits (optimized to match floodHandler.js UX)
const SPAM_INTERVAL_MS    = 1400;          // 🟢 ~1.4s input interval
const FLOOD_LIMIT         = 9;             // 🟢 up to 9 hits
const FLOOD_WINDOW_MS     = 9000;          // 🟢 reset after 9s
const TEMP_MUTE_MS        = 90 * 1000;     // 🟢 1.5min mute duration
const MAX_MESSAGE_LENGTH  = 600;
const MAX_INPUT_FREQUENCY = 6;
const MAX_DISTINCT_INPUTS = 20;

// 🔠 Cached lowercase buttons
const BUTTON_TEXTS = Object.values(MENU_BUTTONS)
  .map(btn => String(btn?.text || "").trim().toLowerCase())
  .filter(Boolean);

const recentTexts = new Map();

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logAction(label, msg, uid = "") {
  console.log(`${new Date().toISOString()} ${label} → ${msg}${uid ? ` (UID: ${uid})` : ""}`);
}

function logError(label, err, uid = "") {
  console.error(`${new Date().toISOString()} ${label} → ${err?.message || err}${uid ? ` (UID: ${uid})` : ""}`);
}

function isAdmin(uid) {
  return String(uid) === String(BOT.ADMIN_ID);
}

// ——— SPAM GUARD ———

export function isSpamming(id) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  const now  = Date.now();
  const last = antiSpam[uid] || 0;
  antiSpam[uid] = now;

  const tooFast = now - last < SPAM_INTERVAL_MS;
  if (tooFast) logAction("⚠️ [isSpamming]", "Too rapid input", uid);
  return tooFast;
}

// ——— FLOOD GUARD ———

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
  if (muted) logAction("🔇 [isMuted]", "User is muted", uid);
  else delete bannedUntil[uid];

  return muted;
}

// ——— DANGER CHECK ———

function isMessageDangerous(id, rawText) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  try {
    const text = String(rawText || "").trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH) {
      logAction("⚠️ [isDangerous]", "Too long or empty", uid);
      return true;
    }

    let history = recentTexts.get(uid) || [];
    if (history.length >= MAX_DISTINCT_INPUTS) history.shift();
    history.push(text);
    recentTexts.set(uid, history);

    const sameCount = history.filter(t => t === text).length;
    if (sameCount >= MAX_INPUT_FREQUENCY) {
      logAction("⚠️ [isDangerous]", "Identical spam", uid);
      return true;
    }

    return false;
  } catch (err) {
    logError("❌ [isDangerous error]", err, uid);
    return true;
  }
}

// ——— MASTER GATEKEEPER ———

export async function canProceed(id, bot, text = "") {
  const uid = sanitizeId(id);
  if (!uid) return false;
  if (isAdmin(uid)) return true;

  const session = userSessions[uid];
  const input   = String(text || "").trim().toLowerCase();

  if (BUTTON_TEXTS.includes(input)) return true;

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

// ——— MUTE ALERT ———

async function notifyUserMuted(bot, id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    await sendAndTrack(bot, uid,
      "⛔ *Too many requests!*\nYou've been temporarily *muted for 1.5 minutes*.",
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    logError("❌ [notifyUserMuted]", err, uid);
  }
}
