// 📦 config/discounts.js | FINAL IMMORTAL v99999999.999 — DISCOUNT ADMIN CORE

export const DISCOUNTS = {
  global: {
    active: false,
    percentage: 10
  },

  users: {
    // User-specific discounts (ID mapped)
    // "123456789": { active: true, percentage: 25 },
  },

  codes: {
    // Code-based discounts: "SUMMER25": { active: true, percentage: 25 }
  }
};

/**
 * 🧮 Resolve best discount for a user/order context
 * @param {Object} args
 * @param {string} args.userId
 * @param {string} [args.code]
 * @returns {number} final discount %
 */
export function resolveDiscount({ userId, code }) {
  let max = 0;

  if (DISCOUNTS.global?.active) {
    max = Math.max(max, DISCOUNTS.global.percentage || 0);
  }

  if (code && DISCOUNTS.codes?.[code]?.active) {
    max = Math.max(max, DISCOUNTS.codes[code].percentage || 0);
  }

  if (userId && DISCOUNTS.users?.[userId]?.active) {
    max = Math.max(max, DISCOUNTS.users[userId].percentage || 0);
  }

  return max;
}

/**
 * 🧾 Returns active discount rules for admin UI
 */
export function getActiveDiscounts() {
  return {
    global: { ...DISCOUNTS.global },
    users: { ...DISCOUNTS.users },
    codes: { ...DISCOUNTS.codes }
  };
}

/**
 * 🛠 Admin setter: update discount value
 * @param {'global'|'user'|'code'} type
 * @param {string|null} key — userId or code (null if global)
 * @param {boolean} active
 * @param {number} percentage
 */
export function setDiscount(type, key, active, percentage) {
  const pct = Math.min(Math.max(parseInt(percentage), 0), 100);

  switch (type) {
    case "global":
      DISCOUNTS.global = { active, percentage: pct };
      break;
    case "user":
      if (!key) return;
      DISCOUNTS.users[key] = { active, percentage: pct };
      break;
    case "code":
      if (!key) return;
      DISCOUNTS.codes[key.toUpperCase()] = { active, percentage: pct };
      break;
  }
}

/**
 * 🧼 Remove discount (user or code)
 * @param {'user'|'code'} type
 * @param {string} key
 */
export function removeDiscount(type, key) {
  if (type === "user") delete DISCOUNTS.users[key];
  if (type === "code") delete DISCOUNTS.codes[key?.toUpperCase()];
}
