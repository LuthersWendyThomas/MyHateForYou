// 📦 config/features.js | BalticPharma V2 — FINAL IMMORTAL FEATURE MIRROR 2025.3

import { FLAGS, CITIES } from "./config.js";

//
// ===============================
// 🛡️ Saugumo jungikliai (.env valdomi)
// ===============================
//

export const autobanEnabled = {
  status: FLAGS.AUTOBAN_ENABLED,
  description: "Po pristatymo automatiškai užblokuoti vartotoją (25–27 min)."
};

export const autodeleteEnabled = {
  status: FLAGS.AUTODELETE_ENABLED,
  description: "Automatiškai ištrinti visas žinutes po pristatymo (25–27 min)."
};

//
// ===============================
// 🚚 Pristatymo metodai (stepHandler + deliveryHandler)
// ===============================
//

export const deliveryMethods = [
  { label: "📍 Drop (5€)", key: "drop", fee: 5 },
  { label: "🚚 Kurjeris (10€)", key: "kurjeris", fee: 10 }
];

//
// ===============================
// 🌍 Galimi miestai (startOrder + UI)
// ===============================
//

export const cities = CITIES.map(city => `🌍 ${city}`);
