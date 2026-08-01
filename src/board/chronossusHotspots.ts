// Tappable action-space hotspots over the Chronossus solo board image
// (public/assets/solo/board-chronossus.jpg, natural size 1500×1110).
//
// POSITIONS ARE PLACEHOLDERS. They are seeded from the Chronobot board's tile
// grid so every action is clickable during the Phase-5 debug harness; the
// Chronossus board's real layout differs, so these must be calibrated in-app
// (Feature 6, step 2a — the boards diverge here). The harness outlines + labels
// each hotspot so activation can be verified before the coordinates are exact.

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
