// 📦 utils/saveOrder.js | IMMORTAL FINAL v4.0 — ULTRA BULLETPROOF LOCKED + SMART BACKUP

import fs from "fs/promises";
import path from "path";

const ordersDir = path.resolve("./data");
const ordersFile = path.join(ordersDir, "orders.json");
const backupFile = path.join(ordersDir, `orders.bak.${Date.now()}.json`);

/**
 * 📁 Ensures the /data folder exists
 */
async function ensureDataDir() {
  try {
    await fs.mkdir(ordersDir, { recursive: true });
  } catch (err) {
    console.error("❌ [ensureDataDir error]:", err.message);
  }
}

/**
 * ✅ Saves a new order (called on successful payment)
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
    if (!Array.isArray(orders)) throw new Error("Orders data corrupted");

    orders.push(newOrder);
    await safeWriteJSON(ordersFile, orders);

    console.log("✅ Order saved:", newOrder);
  } catch (err) {
    console.error("❌ [saveOrder error]:", err.message || err);
  }
}

/**
 * 📊 Revenue/statistics for user/admin
 */
export async function getStats(type = "admin", userId = null) {
  try {
    const orders = await loadOrders();
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const stats = defaultStats();

    const relevant = (type === "user" && userId)
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
    console.error("❌ [getStats error]:", err.message || err);
    return defaultStats();
  }
}

/**
 * 📦 Loads saved orders safely
 */
async function loadOrders() {
  try {
    const raw = await fs.readFile(ordersFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("⚠️ [loadOrders fallback]: empty list returned");
    return [];
  }
}

/**
 * 🧼 Basic sanitizer
 */
function sanitize(str) {
  return String(str || "")
    .replace(/[\n\r\t]/g, " ")
    .replace(/[^\wąčęėįšųūžĄČĘĖĮŠŲŪŽ .,\-_/]/gi, "")
    .trim()
    .slice(0, 80);
}

/**
 * 📈 Default stats model
 */
function defaultStats() {
  return { today: 0, week: 0, month: 0, total: 0 };
}

/**
 * 💾 Smart file writer w/ backup on failure
 */
async function safeWriteJSON(filePath, data) {
  try {
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, json, "utf8");
  } catch (err) {
    console.error("❌ [safeWriteJSON error]:", err.message);
    try {
      const fallback = JSON.stringify(data, null, 2);
      await fs.writeFile(backupFile, fallback, "utf8");
      console.warn("⚠️ Backup written to:", backupFile);
    } catch (backupErr) {
      console.error("❌ [backupWrite failed]:", backupErr.message || backupErr);
    }
  }
}
