// 📦 config/features.js | BalticPharma V2 — FINAL IMMORTAL FEATURE MIRROR 2025.3

import { FLAGS, CITIES } from "./config.js";

//
// ===============================
// 🛡️ Security toggles (controlled via .env)
// ===============================
//

export const autobanEnabled = {
  status: FLAGS.AUTOBAN_ENABLED,
  description: "Automatically block the user after delivery (25–27 min)."
};

export const autodeleteEnabled = {
  status: FLAGS.AUTODELETE_ENABLED,
  description: "Automatically delete all messages after delivery (25–27 min)."
};

//
// ===============================
// 🚚 Delivery methods (used in stepHandler + deliveryHandler)
// ===============================
//

export const deliveryMethods = [
  { label: "📍 Drop (5€)", key: "drop", fee: 5 },
  { label: "🚚 Courier (10€)", key: "courier", fee: 10 }
];

//
// ===============================
// 🌍 Available cities (used in startOrder + UI)
// ===============================
//

export const cities = CITIES.map(city => `🌍 ${city}`);
