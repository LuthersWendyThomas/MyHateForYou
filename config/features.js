// 📦 config/features.js | FINAL IMMORTAL v2025.999999 — BULLETPROOF FEATURE SYNCED

import { FLAGS } from "./config.js";

// ===============================
// 🛡️ Security Flags — Controlled via .env
// ===============================

export const autobanEnabled = {
  status: !!FLAGS.AUTOBAN_ENABLED,
  description: "🚫 Automatically ban user ~25–27min after delivery completion."
};

export const autodeleteEnabled = {
  status: !!FLAGS.AUTODELETE_ENABLED,
  description: "🧼 Auto-delete all user messages after delivery (~25–27min)."
};

// ===============================
// 🚚 Delivery Methods — Used in stepHandler & simulateDelivery
// ===============================

export const DELIVERY_METHODS = [
  {
    label: "📍 Drop (5$)",
    key: "drop",
    fee: 5,
    description: "An anonymous drop point near your city center."
  },
  {
    label: "🚚 Courier (10$)",
    key: "courier",
    fee: 10,
    description: "A courier meets you at a discreet location nearby."
  }
];

// ✅ Cities now embedded in regionMap (stepHandler.js) — no need for static cities[]
