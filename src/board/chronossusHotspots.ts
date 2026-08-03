// Tappable action-space hotspots over the Chronossus solo board image
// (public/assets/solo/board-chronossus.jpg, natural size 1500×1110).
//
// These are TRANSPARENT click targets over the action tiles already printed on
// the board art — we do NOT overlay tile images (unlike the Chronobot board).
// Tapping a box opens that action's DetailPanel (info / debug activation).
// Positions calibrated in-app (calibrate mode emits the literal below).

import type { BoardCounter, Hotspot } from './chronobotHotspots';
import type {
  ParadoxLayout,
  TimeTravelTrackLayout,
  WarpMarkerLayout,
} from './timeTravelTrack';

/**
 * The shared action spaces positioned on the CHRONOSSUS board. Same `Hotspot`
 * shape + `ChronobotActionId`s as the Chronobot (the actions and their rules are
 * shared), so the Chronossus board reuses the Chronobot's DetailPanel popup
 * verbatim — only the coordinates differ. There is no `reboot` space in the
 * Chronossus base setup (Reboot is a modular Action-tile action instead).
 */
export const CHRONOSSUS_ACTION_HOTSPOTS: Hotspot[] = [
  { id: 'h1', action: 'construct-support', rect: [1.2, 15.4, 9.6, 8.9] },
  { id: 'h2', action: 'time-travel', rect: [12.3, 15.4, 9.6, 8.9] },
  { id: 'h3', action: 'construct-superproject', rect: [34, 15.4, 9.6, 8.9] },
  { id: 'h4', action: 'remove-anomaly', rect: [45.1, 15.4, 9.6, 8.9] },
  { id: 'h5', action: 'mine-resource', rect: [23.4, 60.5, 9.6, 8.9] },
  { id: 'h6', action: 'construct-powerplant', rect: [34.3, 63.3, 9.6, 8.9] },
  { id: 'h7', action: 'recruit', rect: [45.2, 35.3, 9.6, 8.9] },
  { id: 'h8', action: 'construct-factory', rect: [12.1, 35.3, 9.6, 8.9] },
  { id: 'h9', action: 'research', rect: [45, 59, 9.6, 8.9] },
  { id: 'h10', action: 'construct-lab', rect: [1, 58.8, 9.6, 8.9] },
  { id: 'h11', action: 'recruit-genius-research', rect: [1.1, 35.3, 9.6, 8.9] },
];

/**
 * Where the action DetailPanel renders over the CHRONOSSUS board:
 * [left, top, width, height] %. Bigger than the Chronobot's right-side default
 * (the Chronossus action tiles sit on the left, so the panel takes the right ~42%).
 */
export const CHRONOSSUS_PANEL: [number, number, number, number] = [57.2, 1.7, 42.2, 97.4];

/** Command marker (token 2–5) positions on the Chronossus board (%, center). Calibrate. */
export interface CommandMarkerPos {
  num: 2 | 3 | 4 | 5;
  pos: [number, number];
}
export const CHRONOSSUS_COMMAND_MARKERS: CommandMarkerPos[] = [
  { num: 3, pos: [6, 10.6] },
  { num: 4, pos: [16.9, 30.5] },
  { num: 2, pos: [39.1, 58.7] },
  { num: 5, pos: [49.9, 30.5] },
];

// --------------------------------------------------------------------------
// Board trackers (the same set as the Chronobot). POSITIONS ARE PLACEHOLDERS
// seeded from the Chronobot layout — the Chronossus board differs, so calibrate
// each group in-app (calibrate mode emits paste-ready literals for all of these).
// --------------------------------------------------------------------------

/** Count/track badges: buildings, superproject, anomalies, breakthroughs, Exosuits, resources, workers. */
export const CHRONOSSUS_COUNTERS: BoardCounter[] = [
  { key: 'mech', pos: [88.5, 12.2], label: 'Powered Exosuits' },
  { key: 'breakthrough', pos: [5.2, 89.1], label: 'Breakthroughs' },
  { key: 'superproject', pos: [22.9, 80.8], label: 'Superproject' },
  { key: 'powerplant', pos: [42.8, 80.8], label: 'Power Plant' },
  { key: 'factory', pos: [55.2, 80.8], label: 'Factory' },
  { key: 'support', pos: [67.3, 80.8], label: 'Life Support' },
  { key: 'lab', pos: [79.6, 80.8], label: 'Lab' },
  { key: 'anomaly', pos: [93.7, 80.8], label: 'Anomalies' },
  { key: 'neutronium', pos: [63, 11.7], label: 'Neutronium' },
  { key: 'uranium', pos: [63, 24.1], label: 'Uranium' },
  { key: 'gold', pos: [63, 36.6], label: 'Gold' },
  { key: 'titanium', pos: [63, 49], label: 'Titanium' },
  { key: 'genius', pos: [73.8, 12.6], label: 'Genius' },
  { key: 'administrator', pos: [73.8, 24.8], label: 'Administrator' },
  { key: 'engineer', pos: [73.8, 37.4], label: 'Engineer' },
  { key: 'scientist', pos: [73.8, 49.9], label: 'Scientist' },
];

/** Time Travel marker's 7 spots (0/2/4/6/8/10/12 VP) + marker width. Calibrate. */
export const CHRONOSSUS_TIME_TRAVEL_TRACK: TimeTravelTrackLayout = {
  spots: [
    [58.2, 66.7],
    [62.7, 66.7],
    [67.5, 66.7],
    [72, 66.7],
    [76.7, 66.7],
    [81.5, 66.7],
    [85.9, 66.7],
  ],
  markerWidth: 5,
};

/** Warp-tile marker (image + count). Calibrate. */
export const CHRONOSSUS_WARP_MARKER: WarpMarkerLayout = {
  pos: [87.1, 57.9],
  width: 5.9,
};

/** The 3 Paradox slots (filled 0–3 during the Paradox phase). Calibrate. */
export const CHRONOSSUS_PARADOX_SLOTS: ParadoxLayout = {
  slots: [
    [93.8, 52.1],
    [94.4, 58.7],
    [93.8, 65.1],
  ],
  width: 6.2,
};
