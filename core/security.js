// 🛡️ core/security.js | FINAL IMMORTAL v999999999.∞+ULTIMATE
// TITANLOCK SYNCED • BULLETPROOF • ULTRA-SAFE • AUTO-BAN • FLOOD-PROOF

import { isBanned, banUser } from "../utils/bans.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { antiSpam, antiFlood, bannedUntil } from "../state/userState.js";
import { BOT } from "../config/config.js";

// ⛔ Security thresholds
const SPAM_INTERVAL_MS = 3300; // Minimum interval between messages to avoid spam
const FLOOD_LIMIT = 6; // Max actions allowed within FLOOD_WINDOW_MS
const FLOOD_WINDOW_MS = 11000; // Time window for flood detection
const TEMP_MUTE_MS = 4 * 60 * 1000; // Temporary mute duration (4 minutes)
const MAX_MESSAGE_LENGTH = 600; // Maximum allowed message length
const MAX_INPUT_FREQUENCY = 4; // Max repeated inputs within recent history
const MAX_DISTINCT_INPUTS = 20; // Max distinct inputs to track in history

const recentTexts = {}; // 🧠 Track recent input strings for each user

/**
 * ✅ Checks if user is admin
 * @param {string|number} id - User ID
 * @returns {boolean} - True if user is admin
 */
function isAdmin(id) {
  return BOT.ADMIN_ID && String(id) === String(BOT.ADMIN_ID);
}

/**
 * ⛔ Detects spam: Too frequent input
 * @param {string|number} id - User ID
 * @returns {boolean} - True if user is spamming
 */
export function isSpamming(id) {
  if (!id || isAdmin(id)) return false;
  const now = Date.now();
  const last = antiSpam[id] || 0;
  antiSpam[id] = now;

  const spamming = now - last < SPAM_INTERVAL_MS;
  if (spamming) logAction("⚠️ [isSpamming]", `User is spamming → ${id}`);
  return spamming;
}

/**
 * 🌊 Handles flood detection: Too many actions in a short time
 * @param {string|number} id - User ID
 * @param {object} bot - Telegram bot instance
 * @returns {Promise<boolean>} - True if user triggered flood protection
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

      await notifyUserMuted(bot, id);
      logAction("⛔ [handleFlood]", `User flooded → Muted for 4 minutes → ${id}`);
      return true;
    }
  } else {
    antiFlood[id] = { count: 1, start: now };
  }

  return false;
}

/**
 * 🔇 Checks if a user is temporarily muted
 * @param {string|number} id - User ID
 * @returns {boolean} - True if user is muted
 */
export function isMuted(id) {
  if (!id || isAdmin(id)) return false;
  const until = bannedUntil[id];
  if (!until) return false;

  const muted = Date.now() < until;
  if (!muted) delete bannedUntil[id]; // Cleanup expired mute
  return muted;
}

/**
 * 💣 Detects dangerous message: Too long or repeated
 * @param {string|number} id - User ID
 * @param {string} rawText - Message text
 * @returns {boolean} - True if message is dangerous
 */
function isMessageDangerous(id, rawText) {
  if (!id || isAdmin(id)) return false;

  const txt = String(rawText || "").trim();
  if (!txt) return true; // Empty message considered dangerous
  if (txt.length > MAX_MESSAGE_LENGTH) return true; // Exceeds max length

  const uid = String(id);
  const history = recentTexts[uid] ||= [];

  if (history.length >= MAX_DISTINCT_INPUTS) history.shift();
  history.push(txt);

  const repeats = history.filter(t => t === txt).length;
  const dangerous = repeats >= MAX_INPUT_FREQUENCY;

  if (dangerous) {
    logAction("⚠️ [isMessageDangerous]", `Dangerous message detected → ${id}`);
  }

  return dangerous;
}

/**
 * ✅ MASTER CHECK — Determines if user is allowed to proceed
 * @param {string|number} id - User ID
 * @param {object} bot - Telegram bot instance
 * @param {string} [text=""] - User input text
 * @returns {Promise<boolean>} - True if user can proceed
 */
export async function canProceed(id, bot, text = "") {
  try {
    if (!id) return false;
    if (isAdmin(id)) return true;
    if (isMuted(id)) {
      logAction("🔇 [canProceed]", `User is muted → ${id}`);
      return false;
    }
    if (await handleFlood(id, bot)) return false;
    if (isSpamming(id)) return false;
    if (isMessageDangerous(id, text)) return false;
    if (await isBanned(id)) {
      logAction("⛔ [canProceed]", `User is banned → ${id}`);
      return false;
    }

    return true;
  } catch (err) {
    logError("❌ [canProceed error]", err, id);
    return false;
  }
}

// ————— HELPERS —————

/**
 * 🔔 Sends a mute notification to the user
 * @param {object} bot - Telegram bot instance
 * @param {string|number} id - User ID
 */
async function notifyUserMuted(bot, id) {
  try {
    await sendAndTrack(
      bot,
      id,
      "⛔ *Too many actions!*\nYou’ve been muted for *4 minutes*.",
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    logError("❌ [notifyUserMuted error]", err, id);
  }
}

/**
 * 📝 Logs successful actions
 * @param {string} action - Action description
 * @param {string} message - Additional details
 */
function logAction(action, message) {
  console.log(`${new Date().toISOString()} ${action} → ${message}`);
}

/**
 * ⚠️ Logs errors
 * @param {string} action - Action description
 * @param {Error|string} error - Error object or message
 * @param {string} [id] - User ID (optional)
 */
function logError(action, error, id = null) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${id ? ` (ID: ${id})` : ""}`);
}
