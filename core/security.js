// 🛡️ core/security.js | IMMORTAL FINAL v3.0.1•SOFTLOCK•999999999X•SYNCED
import { isBanned } from "../utils/bans.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { antiSpam, antiFlood, bannedUntil, userSessions } from "../state/userState.js";
import { MENU_BUTTONS } from "../helpers/keyboardConstants.js";
import { BOT } from "../config/config.js";

// ——— Limitai (SUŠVELNINTI) ———
const SPAM_INTERVAL_MS    = 700;     // 🔄 Minkštintas debounce
const FLOOD_LIMIT         = 12;      // 💦 Didesnė tolerancija
const FLOOD_WINDOW_MS     = 8000;    // ⏱️ Trumpesnis langas
const TEMP_MUTE_MS        = 60 * 1000; // ⏳ Tik 1 min
const MAX_MESSAGE_LENGTH  = 600;
const MAX_INPUT_FREQUENCY = 6;
const MAX_DISTINCT_INPUTS = 20;

// ✅ Mygtukų cache
const BUTTON_TEXTS = Object.values(MENU_BUTTONS)
  .map(btn => String(btn?.text || "").trim().toLowerCase())
  .filter(Boolean);

// 🧠 Tekstų istorija
const recentTexts = new Map();

export async function canProceed(id, bot, text = "") {
  const uid = sanitizeId(id);
  if (!uid) return false;
  if (isAdmin(uid)) return true;

  const session = userSessions[uid] || {};
  const input = String(text || "").trim().toLowerCase();

  if (BUTTON_TEXTS.includes(input)) return true;

  if (session.step === 8 || session.step === 9) {
    const allowed = [
      MENU_BUTTONS.CONFIRM.text.toLowerCase(),
      MENU_BUTTONS.CANCEL.text.toLowerCase()
    ];
    if (allowed.includes(input)) return true;
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

export async function handleFlood(id, bot) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  const now = Date.now();
  const state = antiFlood[uid] || { count: 0, start: now };

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
    state.count = 1;
    state.start = now;
  }

  antiFlood[uid] = state;
  return false;
}

export function isSpamming(id) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  const now = Date.now();
  const last = antiSpam[uid] || 0;
  antiSpam[uid] = now;

  const tooFast = now - last < SPAM_INTERVAL_MS;
  if (tooFast) logAction("⚠️ [isSpamming]", "Too rapid", uid);
  return tooFast;
}

function isMessageDangerous(id, rawText) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  const text = String(rawText || "").trim();
  if (!text || text.length > MAX_MESSAGE_LENGTH) {
    logAction("⚠️ [isDangerous]", "Empty or too long", uid);
    return true;
  }

  const history = recentTexts.get(uid) || [];
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

export function isMuted(id) {
  const uid = sanitizeId(id);
  if (!uid || isAdmin(uid)) return false;

  const until = bannedUntil[uid];
  if (!until) return false;

  const stillMuted = Date.now() < until;
  if (!stillMuted) {
    delete bannedUntil[uid];
    recentTexts.delete(uid);
  }

  if (stillMuted) logAction("🔇 [isMuted]", "User muted", uid);
  return stillMuted;
}

async function notifyUserMuted(bot, uid) {
  try {
    const session = userSessions[uid];
    if (!session?.mutedNotified) {
      await sendAndTrack(bot, uid,
        "⛔ *Too many actions!*\nYou've been *muted for 1 minute*. Please slow down.",
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
  const m = err?.message || err;
  console.error(`${new Date().toISOString()} ${label} → ${m}${uid ? ` (UID: ${uid})` : ""}`);
}
