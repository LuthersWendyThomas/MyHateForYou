// 🛡️ core/security.js | FINAL IMMORTAL v999999999.∞ — TITANLOCK SYNCED BULLETPROOF

import { isBanned, banUser } from "../utils/bans.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { antiSpam, antiFlood, bannedUntil } from "../state/userState.js";
import { BOT } from "../config/config.js";

// ⛔ Security thresholds
const SPAM_INTERVAL_MS = 3300;
const FLOOD_LIMIT = 6;
const FLOOD_WINDOW_MS = 11000;
const TEMP_MUTE_MS = 4 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 600;
const MAX_INPUT_FREQUENCY = 4;
const MAX_DISTINCT_INPUTS = 20;

const recentTexts = {}; // 🧠 Track recent input strings

function isAdmin(id) {
  return BOT.ADMIN_ID && String(id) === String(BOT.ADMIN_ID);
}

/**
 * ⛔ Spam: too frequent input
 */
export function isSpamming(id) {
  if (!id || isAdmin(id)) return false;
  const now = Date.now();
  const last = antiSpam[id] || 0;
  antiSpam[id] = now;
  return now - last < SPAM_INTERVAL_MS;
}

/**
 * 🌊 Flood: too many actions in short time
 */
export async function handleFlood(id, bot) {
  if (!id || isAdmin(id)) return false;

  const now = Date.now();
  const state = antiFlood[id];

  if (!state) {
    antiFlood[id] = { count: 1, start: now };
    return false;
  }

  if (now - state.start <= FLOOD_WINDOW_MS) {
    state.count++;
    if (state.count > FLOOD_LIMIT) {
      bannedUntil[id] = now + TEMP_MUTE_MS;
      delete antiFlood[id];

      await sendAndTrack(
        bot,
        id,
        "⛔ *Too many actions!*\nYou’ve been muted for *4 minutes*.",
        { parse_mode: "Markdown" }
      );

      return true;
    }
  } else {
    antiFlood[id] = { count: 1, start: now };
  }

  return false;
}

/**
 * 🔇 Temp mute status check
 */
export function isMuted(id) {
  if (!id || isAdmin(id)) return false;
  const until = bannedUntil[id];
  if (!until) return false;
  if (Date.now() >= until) {
    delete bannedUntil[id];
    return false;
  }
  return true;
}

/**
 * 💣 Detect dangerous message (too long or repeated)
 */
function isMessageDangerous(id, rawText) {
  if (!id || isAdmin(id)) return false;

  const txt = String(rawText || "").trim();
  if (!txt) return true;
  if (txt.length > MAX_MESSAGE_LENGTH) return true;

  const uid = String(id);
  const history = recentTexts[uid] ||= [];

  if (history.length >= MAX_DISTINCT_INPUTS) history.shift();
  history.push(txt);

  const repeats = history.filter(t => t === txt).length;
  return repeats >= MAX_INPUT_FREQUENCY;
}

/**
 * ✅ MASTER CHECK — Determines if user is allowed to proceed
 */
export async function canProceed(id, bot, text = "") {
  try {
    if (!id) return false;
    if (isAdmin(id)) return true;
    if (isMuted(id)) return false;
    if (await handleFlood(id, bot)) return false;
    if (isSpamming(id)) return false;
    if (isMessageDangerous(id, text)) return false;
    if (await isBanned(id)) return false;
    return true;
  } catch (err) {
    console.error("❌ [canProceed error]:", err.message || err);
    return false;
  }
}
