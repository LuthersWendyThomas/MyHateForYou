// 📦 utils/saveOrder.js | IMMORTAL FINAL v999999999.∞ — ULTRA BULLETPROOF + SMART BACKUP + STATS SYNCED

import fs from "fs/promises";
import path from "path";

const ordersDir = path.resolve("./data");
const ordersFile = path.join(ordersDir, "orders.json");

/**
 * 📁 Užtikrina, kad /data egzistuoja
 */
async function ensureDataDir() {
  try {
    await fs.mkdir(ordersDir, { recursive: true });
  } catch (err) {
    console.error("❌ [ensureDataDir error]:", err.message);
  }
}

/**
 * ✅ Išsaugo naują užsakymą (kviečiamas po apmokėjimo)
 */
export async function saveOrder(userId, city, product, amount) {
  try {
    await ensureDataDir();

    const newOrder = {
      userId: String(userId),
      city: sanitize(city),
      product: sanitize(product),
      amount: parseFloat(amount) || 0,
      date: new Date().toISOString(),
      status: "completed"
    };

    const orders = await loadOrders();
    if (!Array.isArray(orders)) throw new Error("Corrupted orders data");

    orders.push(newOrder);
    await safeWriteJSON(ordersFile, orders);

    console.log("✅ Order saved:", newOrder);
  } catch (err) {
    console.error("❌ [saveOrder error]:", err.message || err);
  }
}

/**
 * 📊 Grąžina statistiką pagal tipą (admin/user)
 */
export async function getStats(type = "admin", userId = null) {
  try {
    const orders = await loadOrders();
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const stats = defaultStats();

    const relevant = type === "user" && userId
      ? orders.filter(o => String(o.userId) === String(userId))
      : orders;

    for (const order of relevant) {
      const amt = parseFloat(order.amount || 0);
      if (!Number.isFinite(amt)) continue;

      const date = new Date(order.date);
      const daysAgo = (now - date) / (1000 * 60 * 60 * 24);

      stats.total += amt;
      if (order.date.startsWith(today)) stats.today += amt;
      if (daysAgo <= 7) stats.week += amt;
      if (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      ) {
        stats.month += amt;
      }
    }

    return stats;
  } catch (err) {
    console.error("❌ [getStats error]:", err.message);
    return defaultStats();
  }
}

/**
 * 📂 Įkelia visus užsakymus
 */
async function loadOrders() {
  try {
    const raw = await fs.readFile(ordersFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn("⚠️ [loadOrders fallback] Empty list used");
    return [];
  }
}

/**
 * 🧼 Sanitize helper (miestui, produktui)
 */
function sanitize(str) {
  return String(str || "")
    .replace(/[\n\r\t]/g, " ")
    .replace(/[^\wąčęėįšųūžĄČĘĖĮŠŲŪŽ .,\-_/]/gi, "")
    .trim()
    .slice(0, 80);
}

/**
 * 📈 Tuščias statistikos modelis
 */
function defaultStats() {
  return { today: 0, week: 0, month: 0, total: 0 };
}

/**
 * 💾 Saugi JSON rašymo funkcija su avariniu kopijavimu
 */
async function safeWriteJSON(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  try {
    await fs.writeFile(filePath, json, "utf8");
  } catch (err) {
    console.error("❌ [safeWriteJSON error]:", err.message);
    try {
      const backupPath = `${filePath}.bak.${Date.now()}`;
      await fs.writeFile(backupPath, json, "utf8");
      console.warn("⚠️ Backup written to:", backupPath);
    } catch (backupErr) {
      console.error("❌ [backupWrite failed]:", backupErr.message);
    }
  }
}
