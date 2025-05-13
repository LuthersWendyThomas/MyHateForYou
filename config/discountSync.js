// 📦 config/discountSync.js | FINAL IMMORTAL v999999999.∞+DIAMONDLOCK
// SYNC ENGINE • AUTO-PATCHED • ZERO CIRCULARS • 24/7 BULLETPROOF

import { DISCOUNTS } from "./discounts.js";
import { products, allCategories } from "./products.js";
import { REGION_MAP, allRegions } from "./regions.js";

/**
 * 🧩 Sync categories
 */
for (const category of allCategories) {
  if (!DISCOUNTS.categories?.[category]) {
    DISCOUNTS.categories[category] = { active: false, percentage: 0 };
  }
}

/**
 * 🧪 Sync products per category
 */
for (const category of allCategories) {
  const items = products[category] || [];
  for (const product of items) {
    if (!product?.name) continue;
    if (!DISCOUNTS.products?.[product.name]) {
      DISCOUNTS.products[product.name] = { active: false, percentage: 0 };
    }
  }
}

/**
 * 🗺️ Sync all regions
 */
for (const region of allRegions) {
  if (!DISCOUNTS.regions?.[region]) {
    DISCOUNTS.regions[region] = { active: false, percentage: 0 };
  }
}

/**
 * 🏙️ Sync cities within regions
 */
for (const region of allRegions) {
  const cities = Object.keys(REGION_MAP?.[region]?.cities || {});
  for (const city of cities) {
    if (!DISCOUNTS.cities?.[city]) {
      DISCOUNTS.cities[city] = { active: false, percentage: 0 };
    }
  }
}

console.log("✅ DISCOUNT SYNC COMPLETE — categories, products, regions, cities 🔒");
