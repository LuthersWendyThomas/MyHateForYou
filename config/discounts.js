import { config } from "dotenv";
config();

// 🌍 Global discount trigger (used with env code)
export const DISCOUNT_CODE = process.env.DISCOUNT_CODE?.trim().toUpperCase() || null;

// ✅ Toggle discounts ON/OFF globally or per scope
export const DISCOUNTS = {
  global: {
    active: false,
    percentage: 10 // % off all products
  },

  categories: {
    "🌿 Cannabis": { active: true, percentage: 15 },
    "❄️ Cocaine": { active: false },
    "💊 Ecstasy": { active: false },
    "🍄 Psychedelics": { active: true, percentage: 10 },
    "🧬 Extracts": { active: false },
    "💉 Opiates": { active: false },
    "🧪 Pharma": { active: false }
  },

  products: {
    "🔥 Zaza (Exotic Indoor)": { active: true, percentage: 20 },
    "💤 Xanax 2mg (Bars)": { active: false }
  },

  cities: {
    "New York": { active: true, percentage: 5 },
    "Miami": { active: false }
  },

  users: {
    "123456789": { active: true, percentage: 25 }, // VIP user
    "987654321": { active: false }
  }
};

/**
 * 🔢 Helper to resolve best discount for given user/product/etc.
 */
export function resolveDiscount({ userId, city, category, productName }) {
  let percent = 0;

  if (DISCOUNTS.global.active) {
    percent = Math.max(percent, DISCOUNTS.global.percentage || 0);
  }

  if (city && DISCOUNTS.cities?.[city]?.active) {
    percent = Math.max(percent, DISCOUNTS.cities[city].percentage || 0);
  }

  if (category && DISCOUNTS.categories?.[category]?.active) {
    percent = Math.max(percent, DISCOUNTS.categories[category].percentage || 0);
  }

  if (productName && DISCOUNTS.products?.[productName]?.active) {
    percent = Math.max(percent, DISCOUNTS.products[productName].percentage || 0);
  }

  if (userId && DISCOUNTS.users?.[userId]?.active) {
    percent = Math.max(percent, DISCOUNTS.users[userId].percentage || 0);
  }

  return percent;
}
