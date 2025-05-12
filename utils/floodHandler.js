// 📦 utils/floodHandler.js | IMMORTAL FINAL v999999999.∞+1 — BULLETPROOF FLOODLOCK SYNCED GODMODE

import {
  antiSpam,
  antiFlood,
  bannedUntil,
  userOrders
} from "../state/userState.js";

import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * ✅ Detects rapid repeated messages (<1s)
 * @param {string|number} id - User ID
 * @returns {boolean} - True if spamming, false otherwise
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
 * ✅ Checks if user is currently muted
 * @param {string|number} id - User ID
 * @returns {boolean} - True if muted, false otherwise
 */
export function isMuted(id) {
  try {
    const until = bannedUntil[id];
    if (!until) return false;

    const now = Date.now();
    if (now < until) return true;

    delete bannedUntil[id]; // Expire mute
    return false;
  } catch (err) {
    console.error("❌ [isMuted error]:", err.message);
    return false;
  }
}

/**
 * ✅ Calculates flood limit dynamically based on user trust (orders)
 * @param {string|number} id - User ID
 * @returns {number} - Flood limit
 */
function getFloodLimit(id) {
  try {
    const count = parseInt(userOrders?.[id] || 0);
    if (count >= 15) return 8; // Trusted user
    if (count >= 5) return 6;  // Semi-trusted user
    return 5;                 // Default limit
  } catch (err) {
    console.warn("⚠️ [getFloodLimit fallback]:", err.message);
    return 5; // Default fallback
  }
}

/**
 * ✅ Handles flood events: warns and mutes users if needed
 * @param {string|number} id - User ID
 * @param {object} bot - Telegram bot instance
 * @param {object} userMessages - Message tracking object
 * @returns {Promise<boolean>} - True if muted, false otherwise
 */
export async function handleFlood(id, bot, userMessages = {}) {
  try {
    const uid = String(id).trim();
    const now = Date.now();

    if (!uid || isMuted(uid)) return true;

    if (!Array.isArray(antiFlood[uid])) antiFlood[uid] = [];

    // Filter the last 5-second window
    antiFlood[uid] = antiFlood[uid].filter(ts => now - ts < 5000);
    antiFlood[uid].push(now);

    const limit = getFloodLimit(uid);
    const hits = antiFlood[uid].length;

    if (hits > limit) {
      bannedUntil[uid] = now + 5 * 60 * 1000; // 5-minute mute

      await sendAndTrack(
        bot,
        uid,
        "⛔️ *Too many actions in a short time.*\n🕓 Session has been *muted for 5 minutes*.",
        { parse_mode: "Markdown" },
        userMessages
      );

      if (process.env.DEBUG_MESSAGES === "true") {
        console.warn(`🚫 [FLOOD MUTE] ${uid} → ${hits}/${limit}`);
      }

      return true; // User muted
    }

    if (hits === limit) {
      await sendAndTrack(
        bot,
        uid,
        "⚠️ *Flood warning:* one more action and your session will be *muted for 5 minutes*.",
        { parse_mode: "Markdown" },
        userMessages
      );

      if (process.env.DEBUG_MESSAGES === "true") {
        console.log(`⚠️ [FLOOD WARN] ${uid} → ${hits}/${limit}`);
      }
    }

    return false; // No mute applied
  } catch (err) {
    console.error("❌ [handleFlood error]:", err.message || err);
    return false;
  }
}
