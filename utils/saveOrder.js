// 📦 utils/saveOrder.js | FINAL IMMORTAL v3.1 — BULLETPROOF-LOCKED SYNC EDITION

import fs from "fs/promises";
import path from "path";

const ordersDir = path.resolve("./data");
const ordersFile = path.join(ordersDir, "orders.json");
const backupFile = path.join(ordersDir, "orders.bak.json");

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
 * ✅ Saves a new order (used on payment confirm)
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
    if (!Array.isArray(orders)) throw new Error("Invalid orders format");

    orders.push(newOrder);
    await safeWriteJSON(ordersFile, orders);

    console.log("✅ Order saved:", newOrder);
  } catch (err) {
    console.error("❌ [saveOrder error]:", err?.message || err);
  }
}

/**
 * 📊 Provides revenue stats for admin/user
 */
export async function getStats(type = "admin", userId = null) {
  try {
    const orders = await loadOrders();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const stats = defaultStats();

    const relevant = (type === "user" && userId)
      ? orders.filter(o => String(o.userId) === String(userId))
      : orders;

    for (const order of relevant) {
      const amount = parseFloat(order.amount || 0);
      if (!Number.isFinite(amount)) continue;

      const date = new Date(order.date);
      const daysAgo = (now - date) / (1000 * 60 * 60 * 24);

      stats.total += amount;
      if (order.date.startsWith(todayStr)) stats.today += amount;
      if (daysAgo <= 7) stats.week += amount;
      if (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      ) {
        stats.month += amount;
      }
    }

    return stats;
  } catch (err) {
    console.error("❌ [getStats error]:", err?.message || err);
    return defaultStats();
  }
}

/**
 * 📦 Loads all saved orders
 */
async function loadOrders() {
  try {
    const raw = await fs.readFile(ordersFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn("⚠️ [loadOrders fallback]: empty list returned");
    return [];
  }
}

/**
 * 🧼 Sanitizes strings (city, product)
 */
function sanitize(str) {
  return String(str || "")
    .replace(/[\n\r\t]/g, " ")
    .replace(/[^\wąčęėįšųūžĄČĘĖĮŠŲŪŽ .,\-_/]/gi, "")
    .trim()
    .slice(0, 80);
}

/**
 * 📈 Returns default zero stats object
 */
function defaultStats() {
  return { today: 0, week: 0, month: 0, total: 0 };
}

/**
 * 💾 Safe write to file (backup fallback if fail)
 */
async function safeWriteJSON(filePath, data) {
  try {
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, json, "utf8");
  } catch (err) {
    console.error("❌ [safeWriteJSON error]:", err.message);
    try {
      const backup = JSON.stringify(data, null, 2);
      await fs.writeFile(backupFile, backup, "utf8");
      console.warn("⚠️ Backup saved to:", backupFile);
    } catch (backupErr) {
      console.error("❌ [backupWrite error]:", backupErr.message || backupErr);
    }
  }
}
