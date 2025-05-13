// 📦 config/discounts.js | FINAL IMMORTAL GODMODE v99999999999999.4 — DIAMONDLOCK SYNCED
// ESM-COMPAT • FSM-SAFE • 24/7 BULLETPROOF • TOBULAI DERINTA SU SYSTEMA

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

/**
 * 🔁 Cloned snapshot (safe for external read)
 */
export function getActiveDiscounts() {
  return JSON.parse(JSON.stringify(DISCOUNTS));
}

/**
 * ✅ Sets or updates a discount
 */
export function setDiscount(type, key, active, percentage) {
  const pct = sanitizePercent(percentage);
  if (type === "global") {
    DISCOUNTS.global = { active, percentage: pct };
    return;
  }
  if (!key) return;

  switch (type) {
    case "user":
      DISCOUNTS.users[key] = { active, percentage: pct };
      break;
    case "code":
      DISCOUNTS.codes[normalize(key)] = { active, percentage: pct };
      break;
    case "region":
      DISCOUNTS.regions[key] = { active, percentage: pct };
      break;
    case "city":
      DISCOUNTS.cities[key] = { active, percentage: pct };
      break;
    case "category":
      DISCOUNTS.categories[key] = { active, percentage: pct };
      break;
    case "product":
      DISCOUNTS.products[key] = { active, percentage: pct };
      break;
    default:
      // unknown type — no-op
      break;
  }
}

/**
 * ❌ Removes a discount
 */
export function removeDiscount(type, key) {
  if (!key) return;

  switch (type) {
    case "user":     delete DISCOUNTS.users[key]; break;
    case "code":     delete DISCOUNTS.codes[normalize(key)]; break;
    case "region":   delete DISCOUNTS.regions[key]; break;
    case "city":     delete DISCOUNTS.cities[key]; break;
    case "category": delete DISCOUNTS.categories[key]; break;
    case "product":  delete DISCOUNTS.products[key]; break;
    default: break;
  }
}

/**
 * 🔍 Checks if *any* discount is active for given key
 */
export function hasDiscount(key) {
  const k = normalize(key);
  return Boolean(
    DISCOUNTS.users?.[key]?.active ||
    DISCOUNTS.codes?.[k]?.active ||
    DISCOUNTS.regions?.[key]?.active ||
    DISCOUNTS.cities?.[key]?.active ||
    DISCOUNTS.categories?.[key]?.active ||
    DISCOUNTS.products?.[key]?.active
  );
}

/**
 * 📊 Returns human-readable discount overview
 */
export function getDiscountInfo() {
  return {
    global: `🌐 Global: ${DISCOUNTS.global.active ? "✅" : "❌"} ${DISCOUNTS.global.percentage || 0}%`,
    users: Object.entries(DISCOUNTS.users).map(([id, d]) =>
      `👤 ${id} — ${d.active ? "✅" : "❌"} ${d.percentage}%`
    ),
    codes: Object.entries(DISCOUNTS.codes).map(([code, d]) =>
      `🏷️ ${code} — ${d.active ? "✅" : "❌"} ${d.percentage}%`
    ),
    regions: Object.entries(DISCOUNTS.regions).map(([r, d]) =>
      `🗺️ ${r} — ${d.active ? "✅" : "❌"} ${d.percentage}%`
    ),
    cities: Object.entries(DISCOUNTS.cities).map(([c, d]) =>
      `🏙️ ${c} — ${d.active ? "✅" : "❌"} ${d.percentage}%`
    ),
    categories: Object.entries(DISCOUNTS.categories).map(([c, d]) =>
      `📦 ${c} — ${d.active ? "✅" : "❌"} ${d.percentage}%`
    ),
    products: Object.entries(DISCOUNTS.products).map(([p, d]) =>
      `🧪 ${p} — ${d.active ? "✅" : "❌"} ${d.percentage}%`
    )
  };
}

// ————— HELPERS —————

function sanitizePercent(val) {
  const n = parseInt(val);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 100) : 0;
}

function normalize(val) {
  return String(val || "").trim().toUpperCase();
}
