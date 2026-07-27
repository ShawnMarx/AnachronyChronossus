// Tappable action-tile hotspots over the Chronobot solo board image
// (public/assets/solo/board-chronobot.jpg, natural size 1500×1110).
//
// Each hotspot is positioned as a percentage rectangle so it scales with the
// responsive image. `action` links to the rule text in CHRONOBOT_ACTIONS so the
// tooltip copy stays in one place. Coordinates are a first pass to calibrate
// against the real board — easy to nudge here.

import type { ChronobotActionId } from '../engine/rules/chronobotActions';

export interface Hotspot {
  id: string;
  action: ChronobotActionId;
  /** Percentage rectangle over the board image: [left, top, width, height]. */
  rect: [number, number, number, number];
  /** Optional label override; defaults to the action's label. */
  note?: string;
  /**
   * Optional override for where the detail panel appears over the board
   * [left, top, width, height] %. Defaults to the right-hand zone.
   */
  panel?: [number, number, number, number];
}

/** A count badge shown on the board (buildings, superproject, anomalies, breakthroughs, mechs). */
export interface BoardCounter {
  key:
    | 'superproject'
    | 'powerplant'
    | 'factory'
    | 'support'
    | 'lab'
    | 'anomaly'
    | 'breakthrough'
    | 'mech'
    | 'neutronium'
    | 'uranium'
    | 'gold'
    | 'titanium'
    | 'genius'
    | 'administrator'
    | 'engineer'
    | 'scientist';
  /** Center position [x, y] % over the board image. */
  pos: [number, number];
  label: string;
}

// Board tracking spots — calibrated in-app against the board art (2026-07-26).
export const BOARD_COUNTERS: BoardCounter[] = [
  { key: 'mech', pos: [83.8, 12.2], label: 'Powered Exosuits' },
  { key: 'breakthrough', pos: [5.2, 89.1], label: 'Breakthroughs' },
  { key: 'superproject', pos: [22.9, 80.8], label: 'Superproject' },
  { key: 'powerplant', pos: [42.8, 80.8], label: 'Power Plant' },
  { key: 'factory', pos: [55.2, 80.8], label: 'Factory' },
  { key: 'support', pos: [67.3, 80.8], label: 'Life Support' },
  { key: 'lab', pos: [79.6, 80.8], label: 'Lab' },
  { key: 'anomaly', pos: [93.7, 80.8], label: 'Anomalies' },
  // Resource trackers — calibrated in-app (2026-07-26).
  { key: 'neutronium', pos: [58.3, 11.7], label: 'Neutronium' },
  { key: 'uranium', pos: [58.3, 24], label: 'Uranium' },
  { key: 'gold', pos: [58.3, 36.5], label: 'Gold' },
  { key: 'titanium', pos: [58.3, 49.1], label: 'Titanium' },
  // Worker trackers — calibrated in-app (2026-07-26).
  { key: 'genius', pos: [69.1, 9.8], label: 'Genius' },
  { key: 'administrator', pos: [69.1, 22.1], label: 'Administrator' },
  { key: 'engineer', pos: [69.1, 35], label: 'Engineer' },
  { key: 'scientist', pos: [69.1, 47.4], label: 'Scientist' },
];

// Uniform tile boxes: columns × rows of the board's action-tile grid.
// [left, top] top-left %; every tile is TW×TH.
const COLS = [4.6, 16.0, 26.6, 38.1];
const ROWS = [15.0, 30.2, 62.6];
const TW = 9.6;
const TH = 8.1;
const box = (c: number, r: number): [number, number, number, number] => [
  COLS[c],
  ROWS[r],
  TW,
  TH,
];

// Reading order follows the board's three tile rows (top, middle, lower).
export const CHRONOBOT_HOTSPOTS: Hotspot[] = [
  // Row 1 (top tiles)
  { id: 'h1', action: 'construct-support', rect: box(0, 0) },
  { id: 'h2', action: 'time-travel', rect: box(1, 0) },
  { id: 'h3', action: 'construct-superproject', rect: box(2, 0) },
  { id: 'h4', action: 'remove-anomaly', rect: box(3, 0) },
  // Row 2 (middle tiles)
  { id: 'h5', action: 'mine-resource', rect: box(0, 1) },
  { id: 'h6', action: 'construct-powerplant', rect: box(1, 1) },
  { id: 'h7', action: 'recruit', rect: box(2, 1) },
  { id: 'h8', action: 'construct-factory', rect: box(3, 1) },
  // Row 3 (lower tiles)
  { id: 'h9', action: 'research', rect: box(0, 2) },
  { id: 'h10', action: 'construct-lab', rect: box(1, 2) },
  { id: 'h11', action: 'recruit-genius-research', rect: box(2, 2) },
  { id: 'h12', action: 'reboot', rect: box(3, 2) },
];
