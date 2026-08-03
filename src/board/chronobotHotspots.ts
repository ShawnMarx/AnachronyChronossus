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
  { key: 'genius', pos: [69.1, 12.3], label: 'Genius' },
  { key: 'administrator', pos: [69.1, 24.7], label: 'Administrator' },
  { key: 'engineer', pos: [69.1, 37.3], label: 'Engineer' },
  { key: 'scientist', pos: [69.1, 49.9], label: 'Scientist' },
];

// Action-tile hotspots — [left, top, width, height] %, calibrated in-app
// (top-left anchored; uniform width/height tuned via the calibrate size sliders).
// Reading order follows the board's three tile rows (top, middle, lower).
export const CHRONOBOT_HOTSPOTS: Hotspot[] = [
  { id: 'h1', action: 'construct-support', rect: [4.7, 14.5, 9.6, 8.9] },
  { id: 'h2', action: 'time-travel', rect: [15.8, 14.5, 9.6, 8.9] },
  { id: 'h3', action: 'construct-superproject', rect: [26.8, 14.5, 9.6, 8.9] },
  { id: 'h4', action: 'remove-anomaly', rect: [37.8, 14.5, 9.6, 8.9] },
  { id: 'h5', action: 'mine-resource', rect: [4.7, 29.4, 9.6, 8.9] },
  { id: 'h6', action: 'construct-powerplant', rect: [15.8, 29.4, 9.6, 8.9] },
  { id: 'h7', action: 'recruit', rect: [26.8, 29.4, 9.6, 8.9] },
  { id: 'h8', action: 'construct-factory', rect: [37.8, 29.4, 9.6, 8.9] },
  { id: 'h9', action: 'research', rect: [4.7, 62.6, 9.6, 8.9] },
  { id: 'h10', action: 'construct-lab', rect: [15.8, 62.6, 9.6, 8.9] },
  { id: 'h11', action: 'recruit-genius-research', rect: [26.8, 62.6, 9.6, 8.9] },
  { id: 'h12', action: 'reboot', rect: [37.8, 62.6, 9.6, 8.9] },
];
