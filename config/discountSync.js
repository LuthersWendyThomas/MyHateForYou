// 📦 config/discountSync.js | IMMORTAL FINAL v9999999999 — NO CIRCULAR IMPORTS

import { DISCOUNTS } from "./discounts.js";
import { products } from "./products.js";
import { REGION_MAP } from "./regions.js";

// ✅ Sync categories/products
for (const category of Object.keys(products)) {
  DISCOUNTS.categories[category] ||= { active: false, percentage: 0 };
  for (const product of products[category]) {
    DISCOUNTS.products[product.name] ||= { active: false, percentage: 0 };
  }
}

// ✅ Sync regions/cities
for (const [region, data] of Object.entries(REGION_MAP)) {
  DISCOUNTS.regions[region] ||= { active: false, percentage: 0 };
  for (const city of Object.keys(data.cities)) {
    DISCOUNTS.cities[city] ||= { active: false, percentage: 0 };
  }
}

console.log("✅ Discount sync complete");
