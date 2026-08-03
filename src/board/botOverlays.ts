// Bot-placement overlay images — art that covers the *real board spots* to show
// the bot "has something there" (a building it constructed, a resource it mined,
// workers it recruited, an anomaly, a superproject, a breakthrough).
//
// The SAME art files drive BOTH boards (Chronobot + Chronossus); only the
// positions and per-type sizes differ per board. An overlay renders when the
// bot's count of that type is > 0; the numeric count badge still tracks the
// quantity (one image per type, not one-per-piece).
//
// Positions are placeholders — calibrate in-app (calibrate mode emits a
// paste-ready `*_OVERLAYS` literal for each board).

import type { BoardCounter } from './chronobotHotspots';

/** Overlay types reuse the BoardCounter keys ('mech' = the bot's Exosuit). */
export type OverlayKey = BoardCounter['key'];

/** Stable render/calibrate order: resources, workers, buildings, then the singles. */
export const OVERLAY_KEYS: OverlayKey[] = [
  'mech',
  'neutronium',
  'uranium',
  'gold',
  'titanium',
  'genius',
  'administrator',
  'engineer',
  'scientist',
  'powerplant',
  'factory',
  'support',
  'lab',
  'anomaly',
  'superproject',
  'breakthrough',
];

/**
 * Art file for each overlay type (under public/assets/solo/chronossus/). Only
 * keys present here render an image; the rest are position placeholders you can
 * still calibrate now and drop art in for later (missing today: the other three
 * resources + breakthrough).
 */
const A = '/assets/solo/chronossus';
export const OVERLAY_ART: Partial<Record<OverlayKey, string>> = {
  mech: `${A}/exosuit-marker.png`,
  neutronium: `${A}/resource-neutronium.png`,
  uranium: `${A}/resource-uranium.png`,
  gold: `${A}/resource-gold.png`,
  titanium: `${A}/resource-titanium.png`,
  genius: `${A}/worker-genius.png`,
  administrator: `${A}/worker-administrator.png`,
  engineer: `${A}/worker-engineer.png`,
  scientist: `${A}/worker-scientist.png`,
  powerplant: `${A}/building-powerplant.png`,
  factory: `${A}/building-factory.png`,
  support: `${A}/building-support.png`,
  lab: `${A}/building-lab.png`,
  anomaly: `${A}/anomaly.png`,
  superproject: `${A}/superproject.png`,
  breakthrough: `${A}/breakthrough.png`,
};

/** Short human label for each type (calibrate list + tooltips). */
export const OVERLAY_LABEL: Record<OverlayKey, string> = {
  mech: 'Exosuit',
  neutronium: 'Neutronium',
  uranium: 'Uranium',
  gold: 'Gold',
  titanium: 'Titanium',
  genius: 'Genius',
  administrator: 'Administrator',
  engineer: 'Engineer',
  scientist: 'Scientist',
  powerplant: 'Power Plant',
  factory: 'Factory',
  support: 'Life Support',
  lab: 'Lab',
  anomaly: 'Anomaly',
  superproject: 'Superproject',
  breakthrough: 'Breakthrough',
};

/** One bot-placement overlay: which type, its center (% of board), and width (%). */
export interface BotOverlay {
  key: OverlayKey;
  /** Center [x, y] as a percentage of the board image. */
  pos: [number, number];
  /** Image width as a percentage of the board width (per-type resize). */
  width: number;
  /** Corner rounding as a % of the image (border-radius); 0/undefined = square. */
  curve?: number;
}

/** Calibration key for one overlay (kept distinct from the count-badge key). */
export const overlayKey = (key: OverlayKey): string => `ov_${key}`;

/** The bot-state fields overlay counts read/write (shared shape for both bots). */
export interface OverlayCountable {
  resources: Record<'neutronium' | 'uranium' | 'gold' | 'titanium', number>;
  workers: Record<'genius' | 'administrator' | 'engineer' | 'scientist', number>;
  buildings: Record<'powerplant' | 'factory' | 'support' | 'lab', number>;
  superprojects: number;
  anomalies: number;
  exosuitsAvailable: number;
  breakthroughs: { circle: number; triangle: number; square: number };
}

/** How many of `key` the bot currently owns (drives whether its overlay shows). */
export function overlayCount(bot: OverlayCountable, key: OverlayKey): number {
  switch (key) {
    case 'mech':
      return bot.exosuitsAvailable;
    case 'superproject':
      return bot.superprojects;
    case 'anomaly':
      return bot.anomalies;
    case 'breakthrough':
      return (
        bot.breakthroughs.circle + bot.breakthroughs.triangle + bot.breakthroughs.square
      );
    case 'neutronium':
    case 'uranium':
    case 'gold':
    case 'titanium':
      return bot.resources[key];
    case 'genius':
    case 'administrator':
    case 'engineer':
    case 'scientist':
      return bot.workers[key];
    default:
      return bot.buildings[key];
  }
}

/**
 * A copy of `bot` with the overlay count for `key` set to `value` (debug-only, so
 * every overlay can be toggled on without playing a full game). Breakthroughs are
 * stored on the Circle shape for simplicity — the overlay only cares about the sum.
 */
export function withOverlayCount<T extends OverlayCountable>(
  bot: T,
  key: OverlayKey,
  value: number,
): T {
  const v = Math.max(0, Math.round(value));
  switch (key) {
    case 'mech':
      return { ...bot, exosuitsAvailable: v };
    case 'superproject':
      return { ...bot, superprojects: v };
    case 'anomaly':
      return { ...bot, anomalies: v };
    case 'breakthrough':
      return { ...bot, breakthroughs: { circle: v, triangle: 0, square: 0 } };
    case 'neutronium':
    case 'uranium':
    case 'gold':
    case 'titanium':
      return { ...bot, resources: { ...bot.resources, [key]: v } };
    case 'genius':
    case 'administrator':
    case 'engineer':
    case 'scientist':
      return { ...bot, workers: { ...bot.workers, [key]: v } };
    default:
      return { ...bot, buildings: { ...bot.buildings, [key]: v } };
  }
}

// Chronobot — calibrated (2026-08-03). Columns/rows aligned (resources x=58.3,
// workers x=69, bottom row y=89.2); widths/curves mirror CHRONOSSUS_OVERLAYS.
export const CHRONOBOT_OVERLAYS: BotOverlay[] = [
  { key: 'mech', pos: [84, 12.2], width: 15.8 },
  { key: 'neutronium', pos: [58.3, 8.2], width: 7.6, curve: 24.2 },
  { key: 'uranium', pos: [58.3, 20.7], width: 7.7, curve: 24.4 },
  { key: 'gold', pos: [58.3, 33], width: 7.7, curve: 24.2 },
  { key: 'titanium', pos: [58.3, 46], width: 7.7, curve: 23.8 },
  { key: 'genius', pos: [69, 7.9], width: 5.8 },
  { key: 'administrator', pos: [69, 20.6], width: 5.8 },
  { key: 'engineer', pos: [69, 33.1], width: 5.8 },
  { key: 'scientist', pos: [69, 45.8], width: 5.8 },
  { key: 'powerplant', pos: [42.7, 89.2], width: 12.2 },
  { key: 'factory', pos: [55.3, 89.2], width: 12.2 },
  { key: 'support', pos: [67.4, 89.2], width: 12.2 },
  { key: 'lab', pos: [79.9, 89.2], width: 12.2 },
  { key: 'anomaly', pos: [93.8, 89.2], width: 12.2 },
  { key: 'superproject', pos: [22.8, 89.2], width: 25 },
  { key: 'breakthrough', pos: [5.3, 89.2], width: 5.8 },
];

// Chronossus — calibrated in-app (2026-08-03).
export const CHRONOSSUS_OVERLAYS: BotOverlay[] = [
  { key: 'mech', pos: [88.5, 12.5], width: 15.8 },
  { key: 'neutronium', pos: [62.9, 8.3], width: 7.6, curve: 24.2 },
  { key: 'uranium', pos: [62.9, 20.8], width: 7.7, curve: 24.4 },
  { key: 'gold', pos: [62.9, 33.4], width: 7.7, curve: 24.2 },
  { key: 'titanium', pos: [62.9, 45.9], width: 7.7, curve: 23.8 },
  { key: 'genius', pos: [73.7, 8.2], width: 5.8 },
  { key: 'administrator', pos: [73.7, 20.5], width: 5.8 },
  { key: 'engineer', pos: [73.7, 33.1], width: 5.8 },
  { key: 'scientist', pos: [73.7, 45.7], width: 5.8 },
  { key: 'powerplant', pos: [42.7, 89.2], width: 12.2 },
  { key: 'factory', pos: [55.2, 89.2], width: 12.2 },
  { key: 'support', pos: [67.6, 89.2], width: 12.2 },
  { key: 'lab', pos: [80, 89.2], width: 12.2 },
  { key: 'anomaly', pos: [93.7, 89.2], width: 12.2 },
  { key: 'superproject', pos: [23, 89.2], width: 25 },
  { key: 'breakthrough', pos: [5.2, 89.2], width: 5.8 },
];
