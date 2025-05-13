// 📦 utils/floodHandler.js | IMMORTAL FINAL v999999999.∞+3 — GODMODE FLOODLOCK SYNCED 24/7
import {
  antiSpam,
  antiFlood,
  bannedUntil,
  userOrders,
  userSessions
} from "../state/userState.js";

import { sendAndTrack } from "../helpers/messageUtils.js";
import { REGION_MAP } from "../config/regions.js";
import { MENU_BUTTONS } from "../helpers/keyboardConstants.js";
import { deliveryMethods } from "../config/features.js";

/**
 * ✅ Detects real spam (excludes buttons, menu, /start, regions, cities, etc.)
 * @param {string|number} id
 * @param {object} ctx - Telegram context (message or callback_query)
 * @returns {boolean}
 */
export function isSpamming(id, ctx = {}) {
  try {
    const isButton = Boolean(ctx?.callback_query || ctx?.message?.reply_markup);
    const text = ctx?.message?.text?.trim().toLowerCase();

    if (
      isButton ||
      text === "/start" ||
      isMenuInput(text, ctx) ||
      isRegion(text) ||
      isCity(ctx, text)
    ) {
      return false;
    }

    const now = Date.now();
    const last = antiSpam[id] || 0;
    antiSpam[id] = now;

    if (now - last < 1000) {
      console.warn(`⚠️ [isSpamming] → Rapid messages detected (UID: ${id})`);
      return true;
    }

    return false;
  } catch (err) {
    console.error("❌ [isSpamming error]:", err.message);
    return false;
  }
}

/**
 * ✅ Flood mute status
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
 * ✅ Dynamic per-user flood limit
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
 * ✅ Flood control (excludes valid user navigation)
 */
export async function handleFlood(id, bot, userMsgs = {}, ctx = {}) {
  try {
    const uid = String(id).trim();
    if (!uid || isMuted(uid)) return true;

    const text = ctx?.message?.text?.trim().toLowerCase();
    const isButton = Boolean(ctx?.callback_query || ctx?.message?.reply_markup);

    if (
      isButton ||
      text === "/start" ||
      isMenuInput(text, ctx) ||
      isRegion(text) ||
      isCity(ctx, text)
    ) {
      return false;
    }

    const now = Date.now();
    if (!Array.isArray(antiFlood[uid])) antiFlood[uid] = [];

    antiFlood[uid] = antiFlood[uid].filter(ts => now - ts < 5000);
    antiFlood[uid].push(now);

    const limit = getFloodLimit(uid);
    const hits = antiFlood[uid].length;

    if (hits > limit) {
      bannedUntil[uid] = now + 5 * 60 * 1000;
      await sendAndTrack(bot, uid,
        "⛔️ *Too many actions in a short time.*\n🕓 Muted for *5 minutes*.",
        { parse_mode: "Markdown" }, userMsgs
      );
      if (process.env.DEBUG_MESSAGES === "true") {
        console.warn(`🚫 [FLOOD MUTE] ${uid} → ${hits}/${limit}`);
      }
      return true;
    }

    if (hits === limit) {
      await sendAndTrack(bot, uid,
        "⚠️ *Flood warning:* next message will mute you *for 5 minutes*.",
        { parse_mode: "Markdown" }, userMsgs
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

// ————— Helpers —————

function isRegion(text = "") {
  const clean = text.trim().toLowerCase();
  return Object.keys(REGION_MAP).some(r => {
    const base = r.replace(/^[^a-z0-9]+/i, "").toLowerCase();
    return base === clean || r.toLowerCase() === clean;
  });
}

function isCity(ctx = {}, text = "") {
  const uid = String(ctx?.message?.chat?.id);
  const clean = text.trim().toLowerCase();
  const region = userSessions?.[uid]?.region;
  const cities = REGION_MAP?.[region]?.cities || {};
  return Object.keys(cities).some(c => {
    const base = c.replace(/^[^a-z0-9]+/i, "").toLowerCase();
    return base === clean;
  });
}

function isMenuInput(text = "", ctx = {}) {
  const clean = text?.toLowerCase();
  const allMenuTexts = [
    ...Object.values(MENU_BUTTONS).map(btn => btn.text?.toLowerCase?.()),
    ...deliveryMethods.map(d => d.label.toLowerCase())
  ];
  return allMenuTexts.includes(clean);
}
