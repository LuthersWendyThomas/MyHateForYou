import fs from "fs";
import path from "path";

// 📁 Lokacijos
const dataDir = path.resolve("./data");
const bansFile = path.join(dataDir, "bans.json");
const tempBansFile = path.join(dataDir, "tempbans.json");

// 🧠 Atmintinė
const bannedUserIds = new Set();     // ⛔ Permanent
const temporaryBans = {};            // ⏳ Temporary

/**
 * 🔒 Saugus ID formatavimas
 */
function safeString(input) {
  return typeof input === "string" ? input.trim() : String(input || "").trim();
}

/**
 * 🚀 Inicializuoja sistemą (kviečiamas automatiškai)
 */
export function initBans() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    if (!fs.existsSync(bansFile)) fs.writeFileSync(bansFile, "[]", "utf8");
    const perm = JSON.parse(fs.readFileSync(bansFile, "utf8"));
    if (Array.isArray(perm)) perm.forEach(id => bannedUserIds.add(safeString(id)));

    if (!fs.existsSync(tempBansFile)) fs.writeFileSync(tempBansFile, "{}", "utf8");
    const temp = JSON.parse(fs.readFileSync(tempBansFile, "utf8"));
    if (temp && typeof temp === "object") Object.assign(temporaryBans, temp);

    console.log(`✅ Ban system loaded → ${bannedUserIds.size} permanent | ${Object.keys(temporaryBans).length} temp`);
  } catch (err) {
    console.error("❌ [initBans error]:", err.message || err);
  }
}

// ⏬ Auto init
initBans();

// — Failų saugojimas
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
// 🧩 PUBLIC API
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
      console.log(`🚫 Banned permanently: ${id}`);
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
    console.log(`⏳ Temp banned: ${id} → until ${new Date(until).toLocaleString("en-GB")}`);
  } catch (err) {
    console.error("❌ [banUserTemporary error]:", err.message);
  }
}

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
    console.log("🧹 Cleared all permanent bans.");
  } catch (err) {
    console.error("❌ [clearBans error]:", err.message);
  }
}

export function clearTempBans() {
  try {
    for (const id in temporaryBans) delete temporaryBans[id];
    saveTempBans();
    console.log("🧼 Cleared all temporary bans.");
  } catch (err) {
    console.error("❌ [clearTempBans error]:", err.message);
  }
}
