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

/** Overlay types reuse the BoardCounter keys, minus 'mech' (the powered-Exosuit tracker). */
export type OverlayKey = Exclude<BoardCounter['key'], 'mech'>;

/** Stable render/calibrate order: resources, workers, buildings, then the singles. */
export const OVERLAY_KEYS: OverlayKey[] = [
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

const seed = (width: number): BotOverlay[] =>
  OVERLAY_KEYS.map((key) => ({ key, pos: [50, 50], width }));

// Placeholder layouts — calibrate each board in-app (emits the literal below).
export const CHRONOBOT_OVERLAYS: BotOverlay[] = seed(6);
export const CHRONOSSUS_OVERLAYS: BotOverlay[] = seed(6);
