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
  gold: `${A}/resource-gold.png`,
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
  // TODO art: neutronium, uranium, titanium, breakthrough
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

const seed = (width: number): BotOverlay[] =>
  OVERLAY_KEYS.map((key) => ({ key, pos: [50, 50], width }));

// Chronobot — placeholder layout (calibrate in-app; emits the literal).
export const CHRONOBOT_OVERLAYS: BotOverlay[] = seed(6);

// Chronossus — calibrated in-app (2026-08-03).
export const CHRONOSSUS_OVERLAYS: BotOverlay[] = [
  { key: 'mech', pos: [50, 50], width: 6 }, // TODO calibrate
  { key: 'neutronium', pos: [63, 8.2], width: 6 },
  { key: 'uranium', pos: [62.8, 20.6], width: 6 },
  { key: 'gold', pos: [62.9, 33], width: 7.2 },
  { key: 'titanium', pos: [62.7, 45.9], width: 6 },
  { key: 'genius', pos: [73.7, 7.9], width: 6 },
  { key: 'administrator', pos: [73.9, 20.4], width: 6 },
  { key: 'engineer', pos: [73.7, 33.1], width: 6 },
  { key: 'scientist', pos: [73.7, 45.7], width: 11.5 },
  { key: 'powerplant', pos: [43, 89.3], width: 12.4 },
  { key: 'factory', pos: [55.2, 89.3], width: 12.4 },
  { key: 'support', pos: [67.6, 89.3], width: 12.4 },
  { key: 'lab', pos: [79.8, 89.3], width: 12.4 },
  { key: 'anomaly', pos: [94.5, 89.3], width: 12.4 },
  { key: 'superproject', pos: [22.9, 89.3], width: 23 },
  { key: 'breakthrough', pos: [5.1, 88.8], width: 4.5 },
];
