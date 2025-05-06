// 📦 utils/floodHandler.js | BalticPharma V2 — v1.6 FINAL MIRROR-PROTECTED EDITION

import {
  antiSpam,
  antiFlood,
  bannedUntil,
  userOrders
} from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";

/**
 * Tikrina ar vartotojas spaudžia per dažnai (<1s tarp žinučių)
 */
export function isSpamming(id) {
  try {
    const now = Date.now();
    const last = antiSpam[id] || 0;
    antiSpam[id] = now;
    return now - last < 1000;
  } catch (err) {
    console.error("❌ [isSpamming klaida]:", err.message);
    return false;
  }
}

/**
 * Tikrina ar vartotojas nutildytas (laikinas blokavimas)
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
    console.error("❌ [isMuted klaida]:", err.message);
    return false;
  }
}

/**
 * Dinamiškai nustato leidžiamų veiksmų kiekį (per 5 sek) pagal naudotojo užsakymų kiekį
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
 * Apdoroja flood atvejus — jei viršyta dinamika, vartotojas nutildomas 5 min.
 */
export async function handleFlood(id, bot, userMessages = {}) {
  try {
    if (isMuted(id)) return true;

    const now = Date.now();
    if (!Array.isArray(antiFlood[id])) antiFlood[id] = [];

    // Filtruojam tik veiksmus per paskutines 5 sekundes
    antiFlood[id] = antiFlood[id].filter(ts => now - ts < 5000);
    antiFlood[id].push(now);

    const limit = getFloodLimit(id);
    const hits = antiFlood[id].length;

    if (hits > limit) {
      bannedUntil[id] = now + 5 * 60 * 1000;

      await sendAndTrack(
        bot,
        id,
        "⛔️ *Per daug veiksmų per trumpą laiką.*\n🕓 Seansas pristabdytas *5 minutėms*.",
        { parse_mode: "Markdown" },
        userMessages
      );

      console.warn(`🚫 [FLOOD MUTE] ${id} viršijo ribą (${hits}/${limit}/5s) — užmutintas.`);
      return true;
    }

    if (hits === limit) {
      await sendAndTrack(
        bot,
        id,
        "⚠️ *Dėmesio:* dar vienas veiksmas ir jūsų seansas bus *laikinai pristabdytas* 5 minutėms.",
        { parse_mode: "Markdown" },
        userMessages
      );
    }

    return false;

  } catch (err) {
    console.error("❌ [handleFlood klaida]:", err.message);
    return false;
  }
}
