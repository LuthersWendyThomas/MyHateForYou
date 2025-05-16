// 📦 utils/floodHandler.js | IMMORTAL FINAL v999999999.∞+SPAMNOTICE+SOFTDEBOUNCE+ULTRAUX

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
 * ⏳ Detect fast duplicate actions (for safeStart redirection warning)
 */
export function isDoubleAction(uid, ctx = {}) {
  try {
    const now = Date.now();
    ctx.session = ctx.session || {};
    const last = ctx.session.lastActionTimestamp || 0;
    ctx.session.lastActionTimestamp = now;
    return now - last < 2000;
  } catch (err) {
    console.error("❌ [isDoubleAction error]:", err.message);
    return false;
  }
}

/**
 * 🧠 Ultra-soft spam prevention (only before step 1)
 */
export function isSpamming(id, ctx = {}) {
  try {
    const isButton = Boolean(ctx?.callback_query || ctx?.message?.reply_markup);
    const text     = ctx?.message?.text?.trim().toLowerCase();
    const uid      = String(id).trim();

    if (isButton || text === "/start") return false;

    const session = userSessions?.[uid];
    if (session?.step && Number(session.step) >= 1) return false;

    const now  = Date.now();
    const last = antiSpam[uid] || 0;
    antiSpam[uid] = now;

    const tooFast = now - last < 700; // 🔄 Sušvelninta
    if (tooFast && process.env.DEBUG_MESSAGES === "true") {
      console.warn(`⚠️ [isSpamming] → Rapid messages detected (UID: ${uid})`);
    }
    return tooFast;
  } catch (err) {
    console.error("❌ [isSpamming error]:", err.message);
    return false;
  }
}

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

function getFloodLimit(id) {
  try {
    const count = parseInt(userOrders?.[id] || 0);
    if (count >= 15) return 24; // ⚡ Padidinta
    if (count >= 5) return 18;
    return 12;
  } catch (err) {
    console.warn("⚠️ [getFloodLimit fallback]:", err.message);
    return 12;
  }
}

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

    antiFlood[uid] = antiFlood[uid].filter(ts => now - ts < 2000); // ⏱️ trumpesnis langas
    antiFlood[uid].push(now);

    const limit = getFloodLimit(uid);
    const hits = antiFlood[uid].length;

    if (hits > limit) {
      bannedUntil[uid] = now + 60 * 1000; // ⏳ Tik 1 min
      await sendAndTrack(bot, uid,
        "⛔️ *Too many actions in short time.*\n🕓 Muted for *1 minute*.",
        { parse_mode: "Markdown" }, userMsgs
      );
      if (process.env.DEBUG_MESSAGES === "true") {
        console.warn(`🚫 [FLOOD MUTE] ${uid} → ${hits}/${limit}`);
      }
      return true;
    }

    if (hits === limit) {
      await sendAndTrack(bot, uid,
        "⚠️ *Flood warning:* next action will mute you *for 1 minute*.",
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
  if (!region || !REGION_MAP[region]) return false;
  const cities = REGION_MAP[region].cities || {};
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
