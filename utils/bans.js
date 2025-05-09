// 📦 utils/bans.js | FINAL IMMORTAL BANLOCK v3.0 — BULLETPROOF DEPLOY-SYNC 2025

import fs from "fs";
import path from "path";

// 📁 Ban failų lokacijos
const dataDir = path.resolve("./data");
const bansFile = path.join(dataDir, "bans.json");
const tempBansFile = path.join(dataDir, "tempbans.json");

// 🧠 Atmintyje laikomi banai
const bannedUserIds = new Set();           // ⛔️ permanent
const temporaryBans = {};                  // ⏳ { userId: timestamp }

/**
 * 🔒 Užtikrina saugų ID
 */
function safeString(input) {
  return typeof input === "string" ? input.trim() : String(input || "").trim();
}

/**
 * 🛠️ Inicializuoja ban sistemą (iš failų)
 */
export function initBans() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    if (!fs.existsSync(bansFile)) fs.writeFileSync(bansFile, "[]", "utf8");
    const permRaw = fs.readFileSync(bansFile, "utf8");
    const permParsed = JSON.parse(permRaw);
    if (Array.isArray(permParsed)) permParsed.forEach(id => bannedUserIds.add(safeString(id)));

    if (!fs.existsSync(tempBansFile)) fs.writeFileSync(tempBansFile, "{}", "utf8");
    const tempRaw = fs.readFileSync(tempBansFile, "utf8");
    const tempParsed = JSON.parse(tempRaw);
    if (tempParsed && typeof tempParsed === "object") {
      Object.assign(temporaryBans, tempParsed);
    }

    console.log(`✅ Ban system loaded: ${bannedUserIds.size} permanent | ${Object.keys(temporaryBans).length} temporary`);
  } catch (err) {
    console.error("❌ [initBans error]:", err.message || err);
  }
}

// 🚀 Auto init
initBans();

// — Persist ban files
function saveBans() {
  try {
    fs.writeFileSync(bansFile, JSON.stringify([...bannedUserIds], null, 2), "utf8");
  } catch (err) {
    console.error("❌ [saveBans error]:", err.message);
  }
}

function saveTempBans() {
  try {
    fs.writeFileSync(tempBansFile, JSON.stringify(temporaryBans, null, 2), "utf8");
  } catch (err) {
    console.error("❌ [saveTempBans error]:", err.message);
  }
}

// ==============================
// 🔓 PUBLIC API
// ==============================

/**
 * ❓ Tikrina ar vartotojas yra užbanintas
 */
export function isBanned(userId) {
  try {
    const id = safeString(userId);
    const now = Date.now();

    if (temporaryBans[id]) {
      if (now < temporaryBans[id]) return true;
      delete temporaryBans[id];
      saveTempBans();
    }

    return bannedUserIds.has(id);
  } catch (err) {
    console.error("❌ [isBanned error]:", err.message);
    return false;
  }
}

/**
 * 🚫 Prideda permanent ban
 */
export function banUser(userId) {
  try {
    const id = safeString(userId);
    if (!bannedUserIds.has(id)) {
      bannedUserIds.add(id);
      saveBans();
      console.log(`🚫 Banned permanently: ${id}`);
    }
  } catch (err) {
    console.error("❌ [banUser error]:", err.message);
  }
}

/**
 * ⏳ Prideda laikiną baną (X minučių)
 */
export function banUserTemporary(userId, minutes = 5) {
  try {
    const id = safeString(userId);
    const until = Date.now() + minutes * 60 * 1000;
    temporaryBans[id] = until;
    saveTempBans();
    console.log(`⏳ Temp banned: ${id} → until ${new Date(until).toLocaleString("en-GB")}`);
  } catch (err) {
    console.error("❌ [banUserTemporary error]:", err.message);
  }
}

/**
 * ✅ Pašalina vartotoją iš visų ban sąrašų
 */
export function unbanUser(userId) {
  try {
    const id = safeString(userId);
    let changed = false;

    if (bannedUserIds.delete(id)) changed = true;
    if (temporaryBans[id]) {
      delete temporaryBans[id];
      changed = true;
    }

    if (changed) {
      saveBans();
      saveTempBans();
      console.log(`✅ Unbanned: ${id}`);
    }
  } catch (err) {
    console.error("❌ [unbanUser error]:", err.message);
  }
}

/**
 * 📋 Grąžina permanent banų sąrašą
 */
export function listBannedUsers() {
  return [...bannedUserIds];
}

/**
 * 📋 Grąžina aktyvių temp banų sąrašą
 */
export function listTemporaryBans() {
  return Object.entries(temporaryBans).map(([id, until]) => ({
    userId: id,
    until: new Date(until).toLocaleString("en-GB")
  }));
}

/**
 * 📈 Kiek iš viso banų
 */
export function getBansCount() {
  return bannedUserIds.size;
}

/**
 * 🧹 Išvalo visus permanent banus
 */
export function clearBans() {
  try {
    bannedUserIds.clear();
    saveBans();
    console.log("🧹 Cleared all permanent bans.");
  } catch (err) {
    console.error("❌ [clearBans error]:", err.message);
  }
}

/**
 * 🧼 Išvalo visus laikinus banus
 */
export function clearTempBans() {
  try {
    for (const id in temporaryBans) delete temporaryBans[id];
    saveTempBans();
    console.log("🧼 Cleared all temporary bans.");
  } catch (err) {
    console.error("❌ [clearTempBans error]:", err.message);
  }
}
