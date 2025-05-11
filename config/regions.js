// 📦 config/regions.js | FINAL IMMORTAL v99999999.∞ — TOGGLE-SYNC + EXPORT-READY + DISCOUNT-ADMIN-SYNC

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

// 🧠 Auto-sync to DISCOUNTS (region + city)
import { DISCOUNTS } from "./discounts.js";

for (const region of Object.keys(REGION_MAP)) {
  DISCOUNTS.regions[region] ||= { active: false, percentage: 0 };

  for (const city of Object.keys(REGION_MAP[region]?.cities || {})) {
    DISCOUNTS.cities[city] ||= { active: false, percentage: 0 };
  }
}

/**
 * 📦 Export flat lists for discounts.js sync + AdminPanel UI
 */
export const allRegions = Object.keys(REGION_MAP);

export const allCities = allRegions.flatMap(region =>
  Object.keys(REGION_MAP[region]?.cities || {})
);

export const getRegionCityPairs = () =>
  allRegions.flatMap(region =>
    Object.keys(REGION_MAP[region].cities).map(city => ({ region, city }))
  );

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
  return allRegions
    .filter(region => REGION_MAP[region].active)
    .map(region => [{ text: region }])
    .concat([[{ text: "🔙 Back" }]]);
}
