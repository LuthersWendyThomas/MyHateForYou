// 📦 utils/bans.js | BalticPharma V2 — FINAL IMMORTAL BANLOCK v2.5

import fs from "fs";
import path from "path";

// — File paths
const dataDir = path.resolve("./data");
const bansFile = path.join(dataDir, "bans.json");
const tempBansFile = path.join(dataDir, "tempbans.json");

const bannedUserIds = new Set();
const temporaryBans = {}; // { userId: timestamp }

/**
 * Prevents null/undefined from becoming "undefined"
 */
function safeString(input) {
  return typeof input === "string" ? input.trim() : String(input || "").trim();
}

/**
 * Initializes the ban system with fallbacks
 */
export function initBans() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    if (!fs.existsSync(bansFile)) fs.writeFileSync(bansFile, "[]");
    const permData = fs.readFileSync(bansFile, "utf8");
    const parsed = JSON.parse(permData);
    if (Array.isArray(parsed)) parsed.forEach(id => bannedUserIds.add(safeString(id)));

    if (!fs.existsSync(tempBansFile)) fs.writeFileSync(tempBansFile, "{}");
    const tempData = fs.readFileSync(tempBansFile, "utf8");
    const tempParsed = JSON.parse(tempData);
    if (tempParsed && typeof tempParsed === "object") {
      Object.assign(temporaryBans, tempParsed);
    }

    console.log(`✅ Ban system initialized: ${bannedUserIds.size} permanent | ${Object.keys(temporaryBans).length} temporary`);
  } catch (err) {
    console.error("❌ [initBans error]:", err.message);
  }
}

// — Auto-init
initBans();

// — File saving
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
// 🚫 PUBLIC API
// ==============================

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

export function banUser(userId) {
  try {
    const id = safeString(userId);
    if (!bannedUserIds.has(id)) {
      bannedUserIds.add(id);
      saveBans();
      console.log(`🚫 Banned: ${id} @ ${new Date().toLocaleString("en-GB")}`);
    }
  } catch (err) {
    console.error("❌ [banUser error]:", err.message);
  }
}

export function banUserTemporary(userId, minutes = 5) {
  try {
    const id = safeString(userId);
    const until = Date.now() + minutes * 60 * 1000;
    temporaryBans[id] = until;
    saveTempBans();
    console.log(`⏳ Temporary ban: ${id} until ${new Date(until).toLocaleString("en-GB")} (${minutes} min)`);
  } catch (err) {
    console.error("❌ [banUserTemporary error]:", err.message);
  }
}

export function unbanUser(userId) {
  try {
    const id = safeString(userId);
    let changed = false;

    if (bannedUserIds.has(id)) {
      bannedUserIds.delete(id);
      changed = true;
    }

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

export function listBannedUsers() {
  return [...bannedUserIds];
}

export function listTemporaryBans() {
  return Object.entries(temporaryBans).map(([id, until]) => ({
    userId: id,
    until: new Date(until).toLocaleString("en-GB")
  }));
}

export function getBansCount() {
  return bannedUserIds.size;
}

export function clearBans() {
  try {
    bannedUserIds.clear();
    saveBans();
    console.log("🧹 Permanent bans cleared.");
  } catch (err) {
    console.error("❌ [clearBans error]:", err.message);
  }
}

export function clearTempBans() {
  try {
    Object.keys(temporaryBans).forEach(id => delete temporaryBans[id]);
    saveTempBans();
    console.log("🧼 Temporary bans cleared.");
  } catch (err) {
    console.error("❌ [clearTempBans error]:", err.message);
  }
}
