// 📦 utils/saveOrder.js | BalticPharma V2 — BULLETPROOF v2025.7 IMMORTAL SYNCED SHIELD EDITION

import fs from "fs/promises";
import path from "path";

const ordersDir = path.resolve("./data");
const ordersFile = path.join(ordersDir, "orders.json");
const backupFile = path.join(ordersDir, "orders.bak.json");

// ✅ Užtikrina, kad ./data katalogas egzistuoja
async function ensureDataDir() {
  try {
    await fs.mkdir(ordersDir, { recursive: true });
  } catch (err) {
    console.error("❌ [ensureDataDir klaida]:", err.message);
  }
}

// ✅ Saugiai išsaugo vieną užsakymą
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
    if (!Array.isArray(orders)) throw new Error("Neteisingas orders formatas");

    orders.push(newOrder);
    await safeWriteJSON(ordersFile, orders);

    console.log("✅ Užsakymas išsaugotas:", newOrder);
  } catch (err) {
    console.error("❌ [saveOrder klaida]:", err?.message || err);
  }
}

// ✅ Grąžina statistiką (šiandien / savaitė / mėnuo / viso)
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
      if (!isFinite(amount)) continue;

      const date = new Date(order.date);
      const daysAgo = (now - date) / (1000 * 60 * 60 * 24);

      stats.total += amount;
      if (order.date.startsWith(todayStr)) stats.today += amount;
      if (daysAgo <= 7) stats.week += amount;
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        stats.month += amount;
      }
    }

    return stats;
  } catch (err) {
    console.error("❌ [getStats klaida]:", err?.message || err);
    return defaultStats();
  }
}

// ✅ Įkelia visus užsakymus arba tuščią masyvą
async function loadOrders() {
  try {
    const raw = await fs.readFile(ordersFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ✅ Pašalina pavojingus simbolius
function sanitize(str) {
  return String(str || "")
    .replace(/[\n\r\t]/g, " ")
    .replace(/[^\wąčęėįšųūžĄČĘĖĮŠŲŪŽ .,\-_/]/gi, "")
    .trim();
}

// ✅ Statinių verčių bazė
function defaultStats() {
  return { today: 0, week: 0, month: 0, total: 0 };
}

// ✅ Saugus JSON įrašymas + atsarginis failas
async function safeWriteJSON(filePath, data) {
  try {
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, json, "utf8");
  } catch (err) {
    console.error("❌ [safeWriteJSON klaida]:", err?.message || err);
    try {
      const backup = JSON.stringify(data, null, 2);
      await fs.writeFile(backupFile, backup, "utf8");
      console.log("⚠️ Įrašyta į atsarginį failą:", backupFile);
    } catch (backupErr) {
      console.error("❌ [backupWrite klaida]:", backupErr?.message || backupErr);
    }
  }
}
