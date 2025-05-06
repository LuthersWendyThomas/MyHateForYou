// 📦 utils/floodHandler.js | BalticPharma V2 — v1.6 FINAL MIRROR-PROTECTED EDITION

import {
  antiSpam,
  antiFlood,
  bannedUntil,
  userOrders
} from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * Checks if the user is clicking too frequently (<1s between messages)
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
 * Checks if the user is muted (temporarily blocked)
 */
export function isMuted(id) {
  try {
    const until = bannedUntil[id];
    if (!until) return false;

    const now = Date.now();
    if (now < until) return true;

    delete bannedUntil[id];
    return false;
  } catch (err) {
    console.error("❌ [isMuted error]:", err.message);
    return false;
  }
}

/**
 * Dynamically determines allowed actions (per 5s) based on the user's order count
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
 * Handles flood events — if the limit is exceeded, the user is muted for 5 minutes
 */
export async function handleFlood(id, bot, userMessages = {}) {
  try {
    if (isMuted(id)) return true;

    const now = Date.now();
    if (!Array.isArray(antiFlood[id])) antiFlood[id] = [];

    // Filter only actions from the last 5 seconds
    antiFlood[id] = antiFlood[id].filter(ts => now - ts < 5000);
    antiFlood[id].push(now);

    const limit = getFloodLimit(id);
    const hits = antiFlood[id].length;

    if (hits > limit) {
      bannedUntil[id] = now + 5 * 60 * 1000;

      await sendAndTrack(
        bot,
        id,
        "⛔️ *Too many actions in a short period.*\n🕓 Session paused for *5 minutes*.",
        { parse_mode: "Markdown" },
        userMessages
      );

      console.warn(`🚫 [FLOOD MUTE] ${id} exceeded limit (${hits}/${limit}/5s) — muted.`);
      return true;
    }

    if (hits === limit) {
      await sendAndTrack(
        bot,
        id,
        "⚠️ *Warning:* one more action and your session will be *temporarily paused* for 5 minutes.",
        { parse_mode: "Markdown" },
        userMessages
      );
    }

    return false;

  } catch (err) {
    console.error("❌ [handleFlood error]:", err.message);
    return false;
  }
}
