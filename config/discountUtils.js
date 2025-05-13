// 📦 config/discountUtils.js | FINAL IMMORTAL v999999999.∞+DIAMONDLOCK
// BULLETPROOF SYNC • NO CIRCULAR • DISCOUNT-SAFE • MAX-PROTECTION

/**
 * 🎯 Resolve best discount from all layers (priority: global → user → code → region → city → category → product)
 * @param {Object} params - Discount context
 * @param {string} [params.userId]
 * @param {string} [params.code]
 * @param {string} [params.region]
 * @param {string} [params.city]
 * @param {string} [params.category]
 * @param {string} [params.productName]
 * @param {Object} DISCOUNTS - Discount object from ./discounts.js
 * @returns {number} Highest matching discount percentage (0–100)
 */
export function resolveDiscount({ userId, code, region, city, category, productName }, DISCOUNTS) {
  let max = 0;

  try {
    if (DISCOUNTS.global?.active)
      max = Math.max(max, sanitize(DISCOUNTS.global.percentage));

    if (code) {
      const normalizedCode = normalize(code);
      if (DISCOUNTS.codes?.[normalizedCode]?.active)
        max = Math.max(max, sanitize(DISCOUNTS.codes[normalizedCode].percentage));
    }

    if (userId && DISCOUNTS.users?.[userId]?.active)
      max = Math.max(max, sanitize(DISCOUNTS.users[userId].percentage));

    if (region && DISCOUNTS.regions?.[region]?.active)
      max = Math.max(max, sanitize(DISCOUNTS.regions[region].percentage));

    if (city && DISCOUNTS.cities?.[city]?.active)
      max = Math.max(max, sanitize(DISCOUNTS.cities[city].percentage));

    if (category && DISCOUNTS.categories?.[category]?.active)
      max = Math.max(max, sanitize(DISCOUNTS.categories[category].percentage));

    if (productName && DISCOUNTS.products?.[productName]?.active)
      max = Math.max(max, sanitize(DISCOUNTS.products[productName].percentage));
  } catch (err) {
    console.error("❌ [resolveDiscount error]", err.message || err);
  }

  return max;
}

// ————— HELPERS —————

/**
 * 🔠 Normalize string input (for discount codes)
 * @param {string} val
 * @returns {string}
 */
function normalize(val) {
  return String(val || "").trim().toUpperCase();
}

/**
 * 🎯 Ensure discount is valid and within range
 * @param {number|string} val
 * @returns {number} Integer between 0–100
 */
function sanitize(val) {
  const n = parseInt(val);
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 100)) : 0;
}
