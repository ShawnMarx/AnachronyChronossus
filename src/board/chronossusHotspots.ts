// Tappable action-space hotspots over the Chronossus solo board image
// (public/assets/solo/board-chronossus.jpg, natural size 1500×1110).
//
// POSITIONS ARE PLACEHOLDERS. They are seeded from the Chronobot board's tile
// grid so every action is clickable during the Phase-5 debug harness; the
// Chronossus board's real layout differs, so these must be calibrated in-app
// (Feature 6, step 2a — the boards diverge here). The harness outlines + labels
// each hotspot so activation can be verified before the coordinates are exact.

import type { ChronossusActionId } from '../engine/bots/chronossus';
import type { Hotspot } from './chronobotHotspots';

/**
 * The 11 real Chronobot action spaces, positioned on the CHRONOSSUS board. Same
 * `Hotspot` shape + `ChronobotActionId`s as the Chronobot (the actions and their
 * rules are shared), so the Chronossus board reuses the Chronobot's DetailPanel
 * popup verbatim — only the coordinates differ. POSITIONS ARE PLACEHOLDERS seeded
 * from the Chronobot grid; calibrate them in-app (calibrate mode emits an updated
 * literal to paste back here).
 */
export const CHRONOSSUS_ACTION_HOTSPOTS: Hotspot[] = [
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

/** Command marker (token 2–5) positions on the Chronossus board (%, center). Calibrate. */
export interface CommandMarkerPos {
  num: 2 | 3 | 4 | 5;
  pos: [number, number];
}
export const CHRONOSSUS_COMMAND_MARKERS: CommandMarkerPos[] = [
  { num: 3, pos: [7, 11] },
  { num: 4, pos: [16, 32] },
  { num: 2, pos: [39, 58] },
  { num: 5, pos: [30, 32] },
];

export interface ChronossusHotspot {
  id: string;
  action: ChronossusActionId;
  /** Percentage rectangle over the board image: [left, top, width, height]. */
  rect: [number, number, number, number];
  /** Short label shown on the hotspot in the harness. */
  label: string;
}

const W = 9.6;
const H = 8.9;

export const CHRONOSSUS_HOTSPOTS: ChronossusHotspot[] = [
  // Base actions (seeded from the Chronobot tile grid — calibrate later).
  { id: 'c-support', action: 'construct-support', rect: [4.7, 14.5, W, H], label: 'Life Support' },
  { id: 'c-tt', action: 'time-travel', rect: [15.8, 14.5, W, H], label: 'Time Travel' },
  { id: 'c-sp', action: 'construct-superproject', rect: [45.0, 14.5, W, H], label: 'Superproject' },
  { id: 'c-anomaly', action: 'remove-anomaly', rect: [56.0, 14.5, W, H], label: 'Remove Anomaly' },
  { id: 'c-mine', action: 'mine-resource', rect: [4.7, 29.4, W, H], label: 'Mine' },
  { id: 'c-pp', action: 'construct-powerplant', rect: [15.8, 29.4, W, H], label: 'Power Plant' },
  { id: 'c-recruit', action: 'recruit', rect: [4.7, 44.0, W, H], label: 'Recruit' },
  { id: 'c-factory', action: 'construct-factory', rect: [15.8, 44.0, W, H], label: 'Factory' },
  { id: 'c-research', action: 'research', rect: [4.7, 62.6, W, H], label: 'Research' },
  { id: 'c-lab', action: 'construct-lab', rect: [15.8, 62.6, W, H], label: 'Lab' },
  { id: 'c-rgr', action: 'recruit-genius-research', rect: [45.0, 62.6, W, H], label: 'Recruit Genius' },
  { id: 'c-reboot', action: 'reboot', rect: [45.0, 44.0, W, H], label: 'Reboot' },
  // The 3 modular Action-tile slots (default A-side setup: C01A→I, C02A→II, C03A→III).
  { id: 'tile-I', action: 'tile-reboot', rect: [28.0, 44.0, W, H], label: 'C01A · I' },
  { id: 'tile-II', action: 'tile-score', rect: [28.0, 14.5, W, H], label: 'C02A · II' },
  { id: 'tile-III', action: 'tile-energy-pack', rect: [38.0, 44.0, W, H], label: 'C03A · III' },
];
