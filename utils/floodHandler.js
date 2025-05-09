// 📦 utils/floodHandler.js | IMMORTAL v3.0 — FINAL BULLETPROOF MIRROR SYNC

import {
  antiSpam,
  antiFlood,
  bannedUntil,
  userOrders
} from "../state/userState.js";

import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * ✅ Spam: detects messages sent <1s apart
 */
export function isSpamming(id) {
  try {
    const now = Date.now();
    const last = antiSpam[id] || 0;
    antiSpam[id] = now;

    const diff = now - last;
    return diff < 1000;
  } catch (err) {
    console.error("❌ [isSpamming error]:", err.message);
    return false;
  }
}

/**
 * ✅ Returns whether the user is muted (temporary flood block)
 */
export function isMuted(id) {
  try {
    const until = bannedUntil[id];
    if (!until) return false;

    const now = Date.now();
    if (now < until) return true;

    // Remove expired mute
    delete bannedUntil[id];
    return false;
  } catch (err) {
    console.error("❌ [isMuted error]:", err.message);
    return false;
  }
}

/**
 * ✅ Dynamic flood tolerance by order count
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
 * ✅ Anti-flood logic with 5s window
 */
export async function handleFlood(id, bot, userMessages = {}) {
  try {
    const uid = String(id).trim();
    const now = Date.now();

    if (!uid || isMuted(uid)) return true;

    if (!Array.isArray(antiFlood[uid])) antiFlood[uid] = [];
    antiFlood[uid] = antiFlood[uid].filter(ts => now - ts < 5000);
    antiFlood[uid].push(now);

    const limit = getFloodLimit(uid);
    const hits = antiFlood[uid].length;

    if (hits > limit) {
      bannedUntil[uid] = now + 5 * 60 * 1000;

      await sendAndTrack(
        bot,
        uid,
        "⛔️ *Too many actions in a short period.*\n🕓 Session paused for *5 minutes*.",
        { parse_mode: "Markdown" },
        userMessages
      );

      if (process.env.DEBUG_MESSAGES === "true") {
        console.warn(`🚫 [FLOOD MUTE] ${uid} → ${hits}/${limit} (5s window)`);
      }

      return true;
    }

    if (hits === limit) {
      await sendAndTrack(
        bot,
        uid,
        "⚠️ *Warning:* one more action and your session will be *paused* for 5 minutes.",
        { parse_mode: "Markdown" },
        userMessages
      );

      if (process.env.DEBUG_MESSAGES === "true") {
        console.log(`⚠️ [FLOOD WARN] ${uid} at limit (${hits}/${limit})`);
      }
    }

    return false;

  } catch (err) {
    console.error("❌ [handleFlood error]:", err.message || err);
    return false;
  }
}
