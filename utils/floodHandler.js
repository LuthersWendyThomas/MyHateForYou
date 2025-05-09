// 📦 utils/floodHandler.js | IMMORTAL v3.1 — FINAL LOCKED BULLETPROOF MIRROR SYNC EDITION

import {
  antiSpam,
  antiFlood,
  bannedUntil,
  userOrders
} from "../state/userState.js";

import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * ✅ Detects messages sent too rapidly (<1s apart)
 */
export function isSpamming(id) {
  try {
    const now = Date.now();
    const last = antiSpam[id] || 0;
    antiSpam[id] = now;
    return now - last < 1000;
  } catch (err) {
    console.error("❌ [isSpamming error]:", err.message);
    return false;
  }
}

/**
 * ✅ Detects if user is under flood mute
 */
export function isMuted(id) {
  try {
    const until = bannedUntil[id];
    if (!until) return false;

    if (Date.now() < until) return true;

    delete bannedUntil[id]; // mute expired
    return false;
  } catch (err) {
    console.error("❌ [isMuted error]:", err.message);
    return false;
  }
}

/**
 * ✅ Adjust flood tolerance based on user trust level
 */
function getFloodLimit(id) {
  try {
    const count = parseInt(userOrders?.[id] || 0);
    if (count >= 15) return 8;
    if (count >= 5) return 6;
    return 5;
  } catch {
    return 5;
  }
}

/**
 * ✅ Flood handler with warnings and session mute
 */
export async function handleFlood(id, bot, userMessages = {}) {
  try {
    const uid = String(id).trim();
    const now = Date.now();

    if (!uid || isMuted(uid)) return true;

    if (!Array.isArray(antiFlood[uid])) antiFlood[uid] = [];

    // Filter to recent 5s window
    antiFlood[uid] = antiFlood[uid].filter(ts => now - ts < 5000);
    antiFlood[uid].push(now);

    const limit = getFloodLimit(uid);
    const hits = antiFlood[uid].length;

    if (hits > limit) {
      bannedUntil[uid] = now + 5 * 60 * 1000;

      await sendAndTrack(
        bot,
        uid,
        "⛔️ *Too many actions in a short time.*\n🕓 Session has been muted for *5 minutes*.",
        { parse_mode: "Markdown" },
        userMessages
      );

      if (process.env.DEBUG_MESSAGES === "true") {
        console.warn(`🚫 [FLOOD MUTE] ${uid} → ${hits}/${limit}`);
      }

      return true;
    }

    if (hits === limit) {
      await sendAndTrack(
        bot,
        uid,
        "⚠️ *Flood warning:* one more action and your session will be *muted* for 5 minutes.",
        { parse_mode: "Markdown" },
        userMessages
      );

      if (process.env.DEBUG_MESSAGES === "true") {
        console.log(`⚠️ [FLOOD WARN] ${uid} → ${hits}/${limit}`);
      }
    }

    return false;

  } catch (err) {
    console.error("❌ [handleFlood error]:", err.message || err);
    return false;
  }
}
