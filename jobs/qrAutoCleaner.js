// 🧹 jobs/qrAutoCleaner.js | IMMORTAL FINAL v1.0.0 • AUTO-CACHE CLEANER

import fs from "fs/promises";
import path from "path";

const CACHE_DIR = "qr-cache";
const MAX_AGE_MS = 60 * 60 * 1000; // 1h

export async function cleanExpiredQRCodes() {
  try {
    const now = Date.now();
    const files = await fs.readdir(CACHE_DIR);
    const targets = files.filter(f => f.endsWith(".png"));

    let deleted = 0;

    for (const file of targets) {
      const fullPath = path.join(CACHE_DIR, file);
      const stats = await fs.stat(fullPath);
      const age = now - stats.mtimeMs;

      if (age > MAX_AGE_MS) {
        await fs.unlink(fullPath);
        deleted++;
        console.log(`🗑️ [QR Cleaner] Deleted expired: ${file}`);
      }
    }

    console.log(`✅ [QR Cleaner] Cleanup complete. ${deleted} expired QR files removed.`);
  } catch (err) {
    console.error(`❌ [QR Cleaner] Failed: ${err.message}`);
  }
}

// Jei nori paleisti standalone:
if (process.argv[1].includes("qrAutoCleaner.js")) {
  cleanExpiredQRCodes();
}
