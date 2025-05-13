// 📦 utils/floodHandler.js | IMMORTAL FINAL v999999999.∞+2 — GODMODE FLOODLOCK 100% SAFE

import {
  antiSpam,
  antiFlood,
  bannedUntil,
  userOrders
} from "../state/userState.js";

import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * ✅ Detects real spam (non-callback / non-menu)
 * @param {string|number} id - User ID
 * @param {object} ctx - Telegram ctx (optional)
 * @returns {boolean}
 */
export function isSpamming(id, ctx = {}) {
  try {
    const isButton = Boolean(ctx?.callback_query || ctx?.message?.reply_markup);
    const text     = ctx?.message?.text?.trim().toLowerCase();
    if (isButton || text === "/start") return false;

    const now  = Date.now();
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
 */
export function isMuted(id) {
  try {
    const until = bannedUntil[id];
    if (!until) return false;

    const now = Date.now();
    if (now < until) return true;

    delete bannedUntil[id]; // mute expired
    return false;
  } catch (err) {
    console.error("❌ [isMuted error]:", err.message);
    return false;
  }
}

/**
 * ✅ Calculates flood limit dynamically
 */
function getFloodLimit(id) {
  try {
    const count = parseInt(userOrders?.[id] || 0);
    if (count >= 15) return 8;
    if (count >= 5) return 6;
    return 5;
  } catch (err) {
    console.warn("⚠️ [getFloodLimit fallback]:", err.message);
    return 5;
  }
}

/**
 * ✅ Flood protection handler — ignores menu/callbacks
 */
export async function handleFlood(id, bot, userMessages = {}, ctx = {}) {
  try {
    const uid = String(id).trim();
    const now = Date.now();
    const isButton = Boolean(ctx?.callback_query || ctx?.message?.reply_markup);
    const isStart = ctx?.message?.text?.trim().toLowerCase() === "/start";

    if (!uid || isMuted(uid)) return true;
    if (isButton || isStart) return false;

    if (!Array.isArray(antiFlood[uid])) antiFlood[uid] = [];

    // Keep only last 5s
    antiFlood[uid] = antiFlood[uid].filter(ts => now - ts < 5000);
    antiFlood[uid].push(now);

    const limit = getFloodLimit(uid);
    const hits  = antiFlood[uid].length;

    if (hits > limit) {
      bannedUntil[uid] = now + 5 * 60 * 1000;

      await sendAndTrack(bot, uid,
        "⛔️ *Too many actions in a short time.*\n🕓 Muted for *5 minutes*.",
        { parse_mode: "Markdown" }, userMessages
      );

      if (process.env.DEBUG_MESSAGES === "true") {
        console.warn(`🚫 [FLOOD MUTE] ${uid} → ${hits}/${limit}`);
      }
      return true;
    }

    if (hits === limit) {
      await sendAndTrack(bot, uid,
        "⚠️ *Flood warning:* next message will mute you *for 5 minutes*.",
        { parse_mode: "Markdown" }, userMessages
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
