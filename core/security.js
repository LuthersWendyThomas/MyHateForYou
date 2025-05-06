// 📦 core/security.js | BalticPharma V2 — FINAL SHIELD v2025.6 ULTRAGUARD LOCK MIRROR POLISH

import { isBanned, banUser } from "../utils/bans.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import {
  antiSpam,
  antiFlood,
  bannedUntil
} from "../state/userState.js";
import { BOT } from "../config/config.js";

// — Konfigūracija
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
 * ✅ Apsauga nuo spaminimo (laiko tarpas tarp žinučių)
 */
export function isSpamming(id) {
  if (!id || isAdmin(id)) return false;

  const now = Date.now();
  const last = antiSpam[id] || 0;
  antiSpam[id] = now;

  return now - last < SPAM_INTERVAL_MS;
}

/**
 * ✅ Apsauga nuo flood'inimo (per daug veiksmų per trumpą laiką)
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
        "⛔ *Per daug veiksmų!* Paskyra laikinai apribota *4 minutėms*.",
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
 * ✅ Tikrina ar naudotojas šiuo metu užtildytas (laikinas banas)
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
 * ✅ Tikrina ar žinutė pavojinga (per ilga, pasikartojanti)
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
 * ✅ Pagrindinis apsaugos filtras — leidžia vykdyti veiksmą tik jei viskas OK
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
    console.error("❌ [canProceed klaida]:", err.message || err);
    return false;
  }
}
