// 📦 config/discountUtils.js | FINAL IMMORTAL v999999999.∞ — BULLETPROOF SYNC + ZERO CIRCULAR DEPENDENCIES

/**
 * 🎯 Resolve best discount from all layers (global → user → code → region → city → category → product)
 * @param {Object} params - Context for resolving discount
 * @param {string} [params.userId]
 * @param {string} [params.code]
 * @param {string} [params.region]
 * @param {string} [params.city]
 * @param {string} [params.category]
 * @param {string} [params.productName]
 * @param {Object} DISCOUNTS - Discount object from ./discounts.js
 * @returns {number} - Highest matching discount percentage
 */
export function resolveDiscount({ userId, code, region, city, category, productName }, DISCOUNTS) {
  let max = 0;

  if (DISCOUNTS.global?.active)
    max = Math.max(max, DISCOUNTS.global.percentage || 0);

  if (code) {
    const normalizedCode = normalize(code);
    if (DISCOUNTS.codes?.[normalizedCode]?.active)
      max = Math.max(max, DISCOUNTS.codes[normalizedCode].percentage || 0);
  }

  if (userId && DISCOUNTS.users?.[userId]?.active)
    max = Math.max(max, DISCOUNTS.users[userId].percentage || 0);

  if (region && DISCOUNTS.regions?.[region]?.active)
    max = Math.max(max, DISCOUNTS.regions[region].percentage || 0);

  if (city && DISCOUNTS.cities?.[city]?.active)
    max = Math.max(max, DISCOUNTS.cities[city].percentage || 0);

  if (category && DISCOUNTS.categories?.[category]?.active)
    max = Math.max(max, DISCOUNTS.categories[category].percentage || 0);

  if (productName && DISCOUNTS.products?.[productName]?.active)
    max = Math.max(max, DISCOUNTS.products[productName].percentage || 0);

  return max;
}

/**
 * 🔠 Normalize string input (used for discount codes)
 * @param {string} val
 * @returns {string}
 */
function normalize(val) {
  return String(val || "").trim().toUpperCase();
}
