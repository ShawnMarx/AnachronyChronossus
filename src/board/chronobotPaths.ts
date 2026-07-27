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

// Positions calibrated in-app against the board art (2026-07-27) — the printed
// token circles above/below each Action tile.

/** Short path: the board's top tile row (4 steps), left → right, loops. */
export const SHORT_PATH: PathSpot[] = [
  [9.5, 9.7], // Short-1 construct-support (Water / Life Support)
  [20.5, 9.7], // Short-2 time-travel
  [31.5, 9.7], // Short-3 construct-superproject
  [42.4, 9.7], // Short-4 remove-anomaly
];

/** Long path: middle row left→right, then lower row right→left (8 steps), loops. */
export const LONG_PATH: PathSpot[] = [
  [9.5, 42.5], // Long-1 mine-resource
  [20.4, 42.5], // Long-2 construct-powerplant
  [31.4, 42.5], // Long-3 recruit
  [42.4, 42.5], // Long-4 construct-factory
  [42.5, 57.9], // Long-5 reboot
  [31.3, 57.9], // Long-6 recruit-genius-research
  [20.4, 57.9], // Long-7 construct-lab
  [9.3, 57.9], // Long-8 research
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
