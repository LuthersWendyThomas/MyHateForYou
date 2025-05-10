// 📦 config/regions.js | FINAL IMMORTAL v99999999 — TOGGLE-SYNC ENABLED

export const REGION_MAP = {
  "🗽 East Coast": {
    active: true,
    cities: {
      "New York": true,
      "Boston": true,
      "Philadelphia": true,
      "Baltimore": true,
      "Washington": true,
      "Charlotte": true
    }
  },
  "🌴 West Coast": {
    active: true,
    cities: {
      "Los Angeles": true,
      "San Diego": true,
      "San Jose": true,
      "San Francisco": true
    }
  },
  "🛢️ South": {
    active: true,
    cities: {
      "Houston": true,
      "Dallas": true,
      "Austin": true,
      "San Antonio": true,
      "Atlanta": true,
      "Miami": true,
      "El Paso": true,
      "Jacksonville": true,
      "Fort Worth": true,
      "Nashville": true,
      "Memphis": true
    }
  },
  "⛰️ Midwest": {
    active: true,
    cities: {
      "Chicago": true,
      "Detroit": true,
      "Indianapolis": true,
      "Columbus": true,
      "Louisville": true
    }
  },
  "🌲 Northwest": {
    active: true,
    cities: {
      "Seattle": true,
      "Portland": true,
      "Denver": true
    }
  },
  "🏜️ Southwest": {
    active: true,
    cities: {
      "Phoenix": true,
      "Las Vegas": true,
      "Oklahoma City": true
    }
  }
};

/**
 * 🧠 UI Helper: convert enabled/disabled cities into Telegram keyboard rows
 */
export function getCityKeyboard(regionKey) {
  const region = REGION_MAP[regionKey];
  if (!region || !region.cities) return [];

  return Object.entries(region.cities).map(([city, isEnabled]) => {
    const label = isEnabled ? city : `🚫 ${city}`;
    return [{ text: label }];
  }).concat([[{ text: "🔙 Back" }]]);
}

/**
 * 🧠 UI Helper: get region keyboard (only active regions)
 */
export function getRegionKeyboard() {
  return Object.entries(REGION_MAP)
    .filter(([_, val]) => val.active)
    .map(([key]) => [{ text: key }])
    .concat([[{ text: "🔙 Back" }]]);
}
