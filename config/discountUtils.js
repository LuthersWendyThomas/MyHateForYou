export function resolveDiscount({ userId, code, region, city, category, productName }, DISCOUNTS) {
  let max = 0;

  if (DISCOUNTS.global?.active) max = Math.max(max, DISCOUNTS.global.percentage || 0);
  if (code && DISCOUNTS.codes?.[normalize(code)]?.active)
    max = Math.max(max, DISCOUNTS.codes[normalize(code)].percentage || 0);
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

function normalize(val) {
  return String(val || "").trim().toUpperCase();
}
