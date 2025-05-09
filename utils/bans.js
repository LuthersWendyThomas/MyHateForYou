// 📦 utils/bans.js | BalticPharma V2 — BULLETPROOF FINAL v2.6

import fs from "fs";
import path from "path";

// — File paths
const dataDir = path.resolve("./data");
const bansFile = path.join(dataDir, "bans.json");
const tempBansFile = path.join(dataDir, "tempbans.json");

// — In-memory ban storage
const bannedUserIds = new Set();
const temporaryBans = {}; // { userId: timestamp }

/**
 * Ensures all IDs are safe strings
 */
function safeString(input) {
  return typeof input === "string" ? input.trim() : String(input || "").trim();
}

/**
 * 🛠️ Initializes the ban system
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
    console.error("❌ [initBans error]:", err.message || err);
  }
}

// — Auto-initialize
initBans();

// — Save handlers
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

/**
 * ⛔ Checks if user is permanently or temporarily banned
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
    console.error("❌ [isBanned error]:", err.message || err);
    return false;
  }
}

/**
 * 🚫 Permanently bans a user
 */
export function banUser(userId) {
  try {
    const id = safeString(userId);
    if (!bannedUserIds.has(id)) {
      bannedUserIds.add(id);
      saveBans();
      console.log(`🚫 Banned: ${id} @ ${new Date().toLocaleString("en-GB")}`);
    }
  } catch (err) {
    console.error("❌ [banUser error]:", err.message || err);
  }
}

/**
 * ⏳ Temporarily bans a user for X minutes
 */
export function banUserTemporary(userId, minutes = 5) {
  try {
    const id = safeString(userId);
    const until = Date.now() + minutes * 60 * 1000;
    temporaryBans[id] = until;
    saveTempBans();
    console.log(`⏳ TempBan: ${id} until ${new Date(until).toLocaleString("en-GB")} (${minutes} min)`);
  } catch (err) {
    console.error("❌ [banUserTemporary error]:", err.message || err);
  }
}

/**
 * ✅ Fully unbans a user from both sets
 */
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
    console.error("❌ [unbanUser error]:", err.message || err);
  }
}

/**
 * 📋 Returns all permanent bans
 */
export function listBannedUsers() {
  return [...bannedUserIds];
}

/**
 * 📋 Returns all active temp bans
 */
export function listTemporaryBans() {
  return Object.entries(temporaryBans).map(([id, until]) => ({
    userId: id,
    until: new Date(until).toLocaleString("en-GB")
  }));
}

/**
 * 📈 Ban count
 */
export function getBansCount() {
  return bannedUserIds.size;
}

/**
 * 🧹 Clears all permanent bans
 */
export function clearBans() {
  try {
    bannedUserIds.clear();
    saveBans();
    console.log("🧹 Permanent bans cleared.");
  } catch (err) {
    console.error("❌ [clearBans error]:", err.message || err);
  }
}

/**
 * 🧼 Clears all temporary bans
 */
export function clearTempBans() {
  try {
    Object.keys(temporaryBans).forEach(id => delete temporaryBans[id]);
    saveTempBans();
    console.log("🧼 Temporary bans cleared.");
  } catch (err) {
    console.error("❌ [clearTempBans error]:", err.message || err);
  }
}
