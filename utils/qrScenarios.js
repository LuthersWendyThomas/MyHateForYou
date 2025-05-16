// 📦 utils/qrScenarios.js
export function getAllQrScenarios() {
  const result = [];
  for (product in products) {
    for (qty/price of product.prices) {
      for (fee of deliveryFees) {
        for (network of networks) {
          result.push({ ... });
        }
      }
    }
  }
  return result;
}
