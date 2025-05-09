// 🛡️ core/security.js | FINAL BULLETPROOF v99999999.9 — TITANLOCK DIAMOND SHIELD EDITION

import { isBanned, banUser } from "../utils/bans.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { antiSpam, antiFlood, bannedUntil } from "../state/userState.js";
import { BOT } from "../config/config.js";

// 🔧 Config
const SPAM_INTERVAL_MS = 3300;
const FLOOD_LIMIT = 6;
const FLOOD_WINDOW_MS = 11000;
const TEMP_MUTE_MS = 4 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 600;
const MAX_INPUT_FREQUENCY = 4;
const MAX_DISTINCT_INPUTS = 20;

const recentTexts = {}; // { userId: [text1, text2, ...] }

/**
 * 🛡️ Checks if ID is admin
 */
function isAdmin(id) {
  return BOT.ADMIN_ID && String(id) === String(BOT.ADMIN_ID);
}

/**
 * ⏱️ Spam check (too fast repeated interactions)
 */
export function isSpamming(id) {
  if (!id || isAdmin(id)) return false;

  const now = Date.now();
  const last = antiSpam[id] || 0;
  antiSpam[id] = now;

  return now - last < SPAM_INTERVAL_MS;
}

/**
 * 🌊 Flood detection — too many messages in short time
 */
export async function handleFlood(id, bot) {
  if (!id || isAdmin(id)) return false;

  const now = Date.now();
  const session = antiFlood[id];

  if (!session) {
    antiFlood[id] = { count: 1, start: now };
    return false;
  }

  if (now - session.start <= FLOOD_WINDOW_MS) {
    session.count++;
    if (session.count > FLOOD_LIMIT) {
      bannedUntil[id] = now + TEMP_MUTE_MS;
      delete antiFlood[id];

      await sendAndTrack(
        bot,
        id,
        "⛔ *Too many actions!*\nYour account has been temporarily muted for *4 minutes*.",
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
 * 🔇 Checks if user is muted
 */
export function isMuted(id) {
  if (!id || isAdmin(id)) return false;

  const until = bannedUntil[id];
  if (!until) return false;

  const now = Date.now();
  if (now >= until) {
    delete bannedUntil[id];
    return false;
  }

  return true;
}

/**
 * ⚠️ Detects dangerous messages: long, repeated, scripted
 */
function isMessageDangerous(id, rawText) {
  if (!id || isAdmin(id)) return false;

  const clean = (rawText || "").toString().trim();
  if (!clean) return true;
  if (clean.length > MAX_MESSAGE_LENGTH) return true;

  const uid = String(id);
  const history = recentTexts[uid] ||= [];

  // Limit stored history
  if (history.length >= MAX_DISTINCT_INPUTS) {
    history.shift();
  }

  history.push(clean);

  const repeats = history.filter(t => t === clean).length;
  return repeats >= MAX_INPUT_FREQUENCY;
}

/**
 * ✅ MASTER GATEKEEPER — central decision on whether to allow input
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
