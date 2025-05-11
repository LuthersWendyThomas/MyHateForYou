// 📦 config/discountSync.js | FINAL IMMORTAL v999999999.∞ — SYNC ENGINE • ZERO CIRCULAR IMPORTS • AUTO-PATCHED

import { DISCOUNTS } from "./discounts.js";
import { products, allCategories } from "./products.js";
import { REGION_MAP, allRegions } from "./regions.js";

// ✅ Sync categories
for (const category of allCategories) {
  if (!DISCOUNTS.categories[category]) {
    DISCOUNTS.categories[category] = { active: false, percentage: 0 };
  }
}

// ✅ Sync products
for (const category of allCategories) {
  for (const product of products[category]) {
    if (!DISCOUNTS.products[product.name]) {
      DISCOUNTS.products[product.name] = { active: false, percentage: 0 };
    }
  }
}

// ✅ Sync regions
for (const region of allRegions) {
  if (!DISCOUNTS.regions[region]) {
    DISCOUNTS.regions[region] = { active: false, percentage: 0 };
  }
}

// ✅ Sync cities
for (const region of allRegions) {
  const cities = Object.keys(REGION_MAP[region]?.cities || {});
  for (const city of cities) {
    if (!DISCOUNTS.cities[city]) {
      DISCOUNTS.cities[city] = { active: false, percentage: 0 };
    }
  }
}

console.log("✅ DISCOUNT SYNC COMPLETE — categories, products, regions, cities 🔒");
