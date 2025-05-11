// 📦 config/discounts.js | FINAL IMMORTAL GODMODE v99999999999999.3 — FIXED FOR ESM + CIRCULAR BREAKER

import { products } from "./products.js";
import { REGION_MAP } from "./regions.js";
import { resolveDiscount } from "./discountUtils.js";

export const DISCOUNT_TYPES = [
  "global", "user", "code", "region", "city", "category", "product"
];

export const DISCOUNTS = {
  global: {
    active: false,
    percentage: 10
  },
  users: {},
  codes: {},
  regions: {},
  cities: {},
  categories: {},
  products: {}
};

// 🧠 Auto-sync categories/products from products.js
for (const category of Object.keys(products)) {
  DISCOUNTS.categories[category] ||= { active: false, percentage: 0 };
  for (const product of products[category]) {
    DISCOUNTS.products[product.name] ||= { active: false, percentage: 0 };
  }
}

// 🧠 Auto-sync regions + cities from regions.js
for (const [region, data] of Object.entries(REGION_MAP)) {
  DISCOUNTS.regions[region] ||= { active: false, percentage: 0 };
  for (const city of Object.keys(data.cities)) {
    DISCOUNTS.cities[city] ||= { active: false, percentage: 0 };
  }
}

export { resolveDiscount };

export function getActiveDiscounts() {
  return JSON.parse(JSON.stringify(DISCOUNTS));
}

export function setDiscount(type, key, active, percentage) {
  const pct = sanitizePercent(percentage);
  if (type === "global") {
    DISCOUNTS.global = { active, percentage: pct };
    return;
  }
  if (!key) return;

  switch (type) {
    case "user": DISCOUNTS.users[key] = { active, percentage: pct }; break;
    case "code": DISCOUNTS.codes[normalize(key)] = { active, percentage: pct }; break;
    case "region": DISCOUNTS.regions[key] = { active, percentage: pct }; break;
    case "city": DISCOUNTS.cities[key] = { active, percentage: pct }; break;
    case "category": DISCOUNTS.categories[key] = { active, percentage: pct }; break;
    case "product": DISCOUNTS.products[key] = { active, percentage: pct }; break;
  }
}

export function removeDiscount(type, key) {
  if (!key) return;
  switch (type) {
    case "user": delete DISCOUNTS.users[key]; break;
    case "code": delete DISCOUNTS.codes[normalize(key)]; break;
    case "region": delete DISCOUNTS.regions[key]; break;
    case "city": delete DISCOUNTS.cities[key]; break;
    case "category": delete DISCOUNTS.categories[key]; break;
    case "product": delete DISCOUNTS.products[key]; break;
  }
}

export function hasDiscount(key) {
  const k = normalize(key);
  return !!(
    DISCOUNTS.users?.[key]?.active ||
    DISCOUNTS.codes?.[k]?.active ||
    DISCOUNTS.regions?.[key]?.active ||
    DISCOUNTS.cities?.[key]?.active ||
    DISCOUNTS.categories?.[key]?.active ||
    DISCOUNTS.products?.[key]?.active
  );
}

export function getDiscountInfo() {
  return {
    global: `🌐 Global: ${DISCOUNTS.global.active ? "✅" : "❌"} ${DISCOUNTS.global.percentage || 0}%`,
    users: Object.entries(DISCOUNTS.users).map(([id, d]) => `👤 ${id} — ${d.active ? "✅" : "❌"} ${d.percentage}%`),
    codes: Object.entries(DISCOUNTS.codes).map(([code, d]) => `🏷️ ${code} — ${d.active ? "✅" : "❌"} ${d.percentage}%`),
    regions: Object.entries(DISCOUNTS.regions).map(([r, d]) => `🗺️ ${r} — ${d.active ? "✅" : "❌"} ${d.percentage}%`),
    cities: Object.entries(DISCOUNTS.cities).map(([c, d]) => `🏙️ ${c} — ${d.active ? "✅" : "❌"} ${d.percentage}%`),
    categories: Object.entries(DISCOUNTS.categories).map(([c, d]) => `📦 ${c} — ${d.active ? "✅" : "❌"} ${d.percentage}%`),
    products: Object.entries(DISCOUNTS.products).map(([p, d]) => `🧪 ${p} — ${d.active ? "✅" : "❌"} ${d.percentage}%`)
  };
}

function sanitizePercent(val) {
  const n = parseInt(val);
  return Math.min(Math.max(n, 0), 100);
}

function normalize(val) {
  return String(val || "").trim().toUpperCase();
}
