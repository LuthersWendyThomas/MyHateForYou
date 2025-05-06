// 📦 core/security.js | BalticPharma V2 — FINAL SHIELD v2025.6 ULTRAGUARD LOCK MIRROR POLISH

import { isBanned, banUser } from "../utils/bans.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { antiSpam, antiFlood, bannedUntil } from "../state/userState.js";
import { BOT } from "../config/config.js";

// — Configuration
const SPAM_INTERVAL_MS = 3300;
const FLOOD_LIMIT = 6;
const FLOOD_WINDOW_MS = 11000;
const TEMP_MUTE_MS = 4 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 600;
const MAX_INPUT_FREQUENCY = 4;

const recentTexts = {}; // { userId: [text1, text2, ...] }

function isAdmin(id) {
  return BOT.ADMIN_ID && String(id) === String(BOT.ADMIN_ID);
}

/**
 * ✅ Spam protection (time interval between messages)
 */
export function isSpamming(id) {
  if (!id || isAdmin(id)) return false;

  const now = Date.now();
  const last = antiSpam[id] || 0;
  antiSpam[id] = now;

  return now - last < SPAM_INTERVAL_MS;
}

/**
 * ✅ Flood protection (too many actions in a short time)
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
        "⛔ *Too many actions!* Your account has been temporarily muted for *4 minutes*.",
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
 * ✅ Checks whether a user is currently muted (temporary ban)
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
 * ✅ Detects dangerous messages (too long or repeated)
 */
function isMessageDangerous(id, text) {
  if (!id || isAdmin(id)) return false;

  if (!text || typeof text !== "string") return true;
  if (text.length > MAX_MESSAGE_LENGTH) return true;

  const history = recentTexts[id] || [];
  const cleanText = text.trim();
  recentTexts[id] = [...history.slice(-MAX_INPUT_FREQUENCY + 1), cleanText];

  const repeated = recentTexts[id].filter(t => t === cleanText).length;
  return repeated >= MAX_INPUT_FREQUENCY;
}

/**
 * ✅ Main security filter — allows action only if all checks pass
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
    // Improved error handling
    return false;
  }
}
