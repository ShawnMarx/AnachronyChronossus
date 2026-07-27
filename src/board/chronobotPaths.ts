// Board %-anchor positions for each Command-token path step, over the Chronobot
// solo board image (public/assets/solo/board-chronobot.jpg, 1500×1110).
//
// The Action *sequences* + advancement live in the engine
// (`Chronobot.CHRONOBOT_PATHS`); this file holds only where a token marker sits
// on the board at each step, as a percentage [x, y] center (like BOARD_COUNTERS).
// Seeded from the tile-grid centers; fine-tune in-app via calibrate mode.

import type { PathId } from '../engine';

/** A marker anchor for one step on a path: center [x, y] % of the board image. */
export type PathSpot = [number, number];

// Seed anchors from the hotspot tile grid (chronobotHotspots.ts): tile centers.
// COLS top-left = [4.6, 16.0, 26.6, 38.1], TW = 9.6 → center = col + 4.8.
// ROWS top-left = [15.0, 30.2, 62.6], TH = 8.1 → center = row + 4.05.
const CX = [9.4, 20.8, 31.4, 42.9]; // column centers
const CY = [19.05, 34.25, 66.65]; // row centers

/** Short path: the board's top tile row (4 steps), left → right, loops. */
export const SHORT_PATH: PathSpot[] = [
  [CX[0], CY[0]], // Short-1 Construct Water
  [CX[1], CY[0]], // Short-2 Time Travel
  [CX[2], CY[0]], // Short-3 Construct Superproject
  [CX[3], CY[0]], // Short-4 Remove Anomaly
];

/** Long path: middle row left→right, then lower row right→left (8 steps), loops. */
export const LONG_PATH: PathSpot[] = [
  [CX[0], CY[1]], // Long-1 Mine
  [CX[1], CY[1]], // Long-2 Construct Power Plant
  [CX[2], CY[1]], // Long-3 Recruit
  [CX[3], CY[1]], // Long-4 Construct Factory
  [CX[3], CY[2]], // Long-5 Reboot
  [CX[2], CY[2]], // Long-6 Recruit Genius / Research
  [CX[1], CY[2]], // Long-7 Construct Lab
  [CX[0], CY[2]], // Long-8 Research
];

/** All path spots for a given path id. */
export const PATH_SPOTS: Record<PathId, PathSpot[]> = {
  short: SHORT_PATH,
  long: LONG_PATH,
};

/** Marker render width as a % of board width. */
export const MARKER_WIDTH = 6.5;

/** Marker art per Command token number. */
export const COMMAND_MARKER_IMG: Record<number, string> = {
  2: '/assets/solo/commands/marker-2.png',
  3: '/assets/solo/commands/marker-3.png',
  4: '/assets/solo/commands/marker-4.png',
  5: '/assets/solo/commands/marker-5.png',
};
