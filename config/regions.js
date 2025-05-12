// 📦 config/regions.js | FINAL IMMORTAL v1.0.2•GODMODE DIAMONDLOCK
// TOGGLE-SYNC + EXPORT-READY + DISCOUNT-ADMIN-SYNC
// Added city-specific emojis for better UX

export const REGION_MAP = {
  "🗽 East Coast": {
    active: true,
    cities: {
      "🗽 New York": true,
      "🎓 Boston": true,
      "🦅 Philadelphia": true,
      "⚓ Baltimore": true,
      "🏛️ Washington": true,
      "🌸 Charlotte": true
    }
  },
  "🌴 West Coast": {
    active: true,
    cities: {
      "🎬 Los Angeles": true,
      "🏖️ San Diego": true,
      "💻 San Jose": true,
      "🌉 San Francisco": true
    }
  },
  "🛢️ South": {
    active: true,
    cities: {
      "🚀 Houston": true,
      "🤠 Dallas": true,
      "🎸 Austin": true,
      "🏰 San Antonio": true,
      "🏟️ Atlanta": true,
      "🏝️ Miami": true,
      "🗻 El Paso": true,
      "🏈 Jacksonville": true,
      "🏇 Fort Worth": true,
      "🎶 Nashville": true,
      "🎷 Memphis": true
    }
  },
  "⛰️ Midwest": {
    active: true,
    cities: {
      "🌆 Chicago": true,
      "🚗 Detroit": true,
      "🏁 Indianapolis": true,
      "🏙️ Columbus": true,
      "🐎 Louisville": true
    }
  },
  "🌲 Northwest": {
    active: true,
    cities: {
      "☕ Seattle": true,
      "🌲 Portland": true,
      "🏔️ Denver": true
    }
  },
  "🏜️ Southwest": {
    active: true,
    cities: {
      "🔥 Phoenix": true,
      "🎲 Las Vegas": true,
      "🌪️ Oklahoma City": true
    }
  }
};

// flat exports for discounts/admin
export const allRegions = Object.keys(REGION_MAP);
export const allCities = allRegions.flatMap(r => Object.keys(REGION_MAP[r].cities));
export const getRegionCityPairs = () =>
  allRegions.flatMap(region =>
    Object.keys(REGION_MAP[region].cities).map(city => ({ region, city }))
  );

/**
 * 🧠 UI Helper: per-region city keyboard
 */
export function getCityKeyboard(regionKey) {
  const region = REGION_MAP[regionKey];
  if (!region || !region.cities) return [];
  return Object.entries(region.cities)
    .map(([city, enabled]) => [{ text: enabled ? city : `🚫 ${city}` }])
    .concat([[{ text: "🔙 Back" }]]);
}

/**
 * 🧠 UI Helper: region selector keyboard
 */
export function getRegionKeyboard() {
  return allRegions
    .filter(r => REGION_MAP[r].active)
    .map(r => [{ text: r }])
    .concat([[{ text: "🔙 Back" }]]);
}
