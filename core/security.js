// 🛡️ core/security.js | FINAL BULLETPROOF SHIELD v2025.9 TITANLOCK MIRROR EDITION

import { isBanned, banUser } from "../utils/bans.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { antiSpam, antiFlood, bannedUntil } from "../state/userState.js";
import { BOT } from "../config/config.js";

// 🧠 Configurable limits
const SPAM_INTERVAL_MS = 3300;
const FLOOD_LIMIT = 6;
const FLOOD_WINDOW_MS = 11000;
const TEMP_MUTE_MS = 4 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 600;
const MAX_INPUT_FREQUENCY = 4;
const MAX_DISTINCT_INPUTS = 20;

const recentTexts = {}; // { userId: [msg1, msg2, ...] }

function isAdmin(id) {
  return BOT.ADMIN_ID && String(id) === String(BOT.ADMIN_ID);
}

/**
 * ⏱️ Detects rapid message sending (spam)
 */
export function isSpamming(id) {
  if (!id || isAdmin(id)) return false;

  const now = Date.now();
  const last = antiSpam[id] || 0;
  antiSpam[id] = now;

  return now - last < SPAM_INTERVAL_MS;
}

/**
 * 🌊 Detects message flood (too many in a time window)
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
 * ⛔ Checks if user is under temporary mute (from flood/spam)
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
 * ⚠️ Detects repeated inputs, long messages, or scripted abuse
 */
function isMessageDangerous(id, rawText) {
  if (!id || isAdmin(id)) return false;

  const cleanText = (rawText || "").toString().trim();

  if (!cleanText) return true;
  if (cleanText.length > MAX_MESSAGE_LENGTH) return true;

  const uid = String(id);
  const history = recentTexts[uid] || [];

  // Limit how many unique messages we store (to block rotation attacks)
  if (history.length >= MAX_DISTINCT_INPUTS) {
    history.shift();
  }

  recentTexts[uid] = [...history, cleanText];

  const repeatCount = recentTexts[uid].filter(t => t === cleanText).length;
  return repeatCount >= MAX_INPUT_FREQUENCY;
}

/**
 * ✅ MASTER GATEKEEPER — allows or blocks further interaction
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
