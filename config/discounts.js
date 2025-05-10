// 📦 config/discounts.js | FINAL IMMORTAL GODMODE v99999999999999.0 — DISCOUNT ADMIN CORE

export const DISCOUNT_TYPES = [
  "global", "user", "code", "region", "city", "category", "product"
];

export const DISCOUNTS = {
  global: {
    active: false,
    percentage: 10
  },

  users: {
    // "123456789": { active: true, percentage: 25 }
  },

  codes: {
    // "SUMMER25": { active: true, percentage: 25 }
  },

  regions: {
    // "🗽 East Coast": { active: true, percentage: 15 }
  },

  cities: {
    // "New York": { active: true, percentage: 5 }
  },

  categories: {
    // "🌿 Cannabis": { active: true, percentage: 10 }
  },

  products: {
    // "🔥 Zaza (Exotic Indoor)": { active: true, percentage: 20 }
  }
};

/**
 * 🧠 Resolve best applicable discount %
 * @param {Object} args
 * @param {string} args.userId
 * @param {string} [args.code]
 * @param {string} [args.region]
 * @param {string} [args.city]
 * @param {string} [args.category]
 * @param {string} [args.productName]
 * @returns {number} final % discount (0–100)
 */
export function resolveDiscount({ userId, code, region, city, category, productName }) {
  let max = 0;

  if (DISCOUNTS.global?.active) {
    max = Math.max(max, DISCOUNTS.global.percentage || 0);
  }

  if (code && DISCOUNTS.codes?.[normalize(code)]?.active) {
    max = Math.max(max, DISCOUNTS.codes[normalize(code)].percentage || 0);
  }

  if (userId && DISCOUNTS.users?.[userId]?.active) {
    max = Math.max(max, DISCOUNTS.users[userId].percentage || 0);
  }

  if (region && DISCOUNTS.regions?.[region]?.active) {
    max = Math.max(max, DISCOUNTS.regions[region].percentage || 0);
  }

  if (city && DISCOUNTS.cities?.[city]?.active) {
    max = Math.max(max, DISCOUNTS.cities[city].percentage || 0);
  }

  if (category && DISCOUNTS.categories?.[category]?.active) {
    max = Math.max(max, DISCOUNTS.categories[category].percentage || 0);
  }

  if (productName && DISCOUNTS.products?.[productName]?.active) {
    max = Math.max(max, DISCOUNTS.products[productName].percentage || 0);
  }

  return max;
}

/**
 * 📦 Get all discount data
 */
export function getActiveDiscounts() {
  return JSON.parse(JSON.stringify(DISCOUNTS)); // Deep copy for safety
}

/**
 * 🛠 Sets a discount for any supported type
 * @param {'global'|'user'|'code'|'region'|'city'|'category'|'product'} type
 * @param {string|null} key
 * @param {boolean} active
 * @param {number} percentage
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
  }
}

/**
 * ❌ Removes discount entry (non-global)
 * @param {'user'|'code'|'region'|'city'|'category'|'product'} type
 * @param {string} key
 */
export function removeDiscount(type, key) {
  if (!key) return;

  switch (type) {
    case "user":
      delete DISCOUNTS.users[key];
      break;
    case "code":
      delete DISCOUNTS.codes[normalize(key)];
      break;
    case "region":
      delete DISCOUNTS.regions[key];
      break;
    case "city":
      delete DISCOUNTS.cities[key];
      break;
    case "category":
      delete DISCOUNTS.categories[key];
      break;
    case "product":
      delete DISCOUNTS.products[key];
      break;
  }
}

/**
 * ✅ Check if discount is active for a key
 * @param {string} key
 * @returns {boolean}
 */
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

/**
 * 🧾 Prepares printable info for AdminPanel UI
 */
export function getDiscountInfo() {
  return {
    global: `🌐 Global: ${DISCOUNTS.global.active ? "✅" : "❌"} ${DISCOUNTS.global.percentage || 0}%`,
    users: Object.entries(DISCOUNTS.users).map(([id, d]) =>
      `👤 ${id} — ${d.active ? "✅" : "❌"} ${d.percentage}%`),
    codes: Object.entries(DISCOUNTS.codes).map(([code, d]) =>
      `🏷️ ${code} — ${d.active ? "✅" : "❌"} ${d.percentage}%`),
    regions: Object.entries(DISCOUNTS.regions).map(([r, d]) =>
      `🗺️ ${r} — ${d.active ? "✅" : "❌"} ${d.percentage}%`),
    cities: Object.entries(DISCOUNTS.cities).map(([c, d]) =>
      `🏙️ ${c} — ${d.active ? "✅" : "❌"} ${d.percentage}%`),
    categories: Object.entries(DISCOUNTS.categories).map(([c, d]) =>
      `📦 ${c} — ${d.active ? "✅" : "❌"} ${d.percentage}%`),
    products: Object.entries(DISCOUNTS.products).map(([p, d]) =>
      `🧪 ${p} — ${d.active ? "✅" : "❌"} ${d.percentage}%`)
  };
}

// ——— Internal helpers ———

function sanitizePercent(val) {
  const n = parseInt(val);
  return Math.min(Math.max(n, 0), 100);
}

function normalize(val) {
  return String(val || "").trim().toUpperCase();
}
