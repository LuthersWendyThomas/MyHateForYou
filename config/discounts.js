// 📦 config/discounts.js | FINAL IMMORTAL v99999999.999 — DISCOUNT-SYNC CORE

import { config } from "dotenv";
config();

// 🌐 Optional global env-based discount activator
export const DISCOUNT_CODE = process.env.DISCOUNT_CODE?.trim().toUpperCase() || null;

// 🎯 Centralized discount rules
export const DISCOUNTS = {
  global: {
    active: false,
    percentage: 10
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
    "123456789": { active: true, percentage: 25 },
    "987654321": { active: false }
  }
};

/**
 * 🧮 Resolves the highest applicable discount for a user/session
 * @param {Object} args
 * @param {string} args.userId
 * @param {string} args.city
 * @param {string} args.category
 * @param {string} args.productName
 * @returns {number} Percentage discount (0–100)
 */
export function resolveDiscount({ userId, city, category, productName }) {
  let max = 0;

  if (DISCOUNTS.global?.active) {
    max = Math.max(max, DISCOUNTS.global.percentage || 0);
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

  if (userId && DISCOUNTS.users?.[userId]?.active) {
    max = Math.max(max, DISCOUNTS.users[userId].percentage || 0);
  }

  return max;
}
