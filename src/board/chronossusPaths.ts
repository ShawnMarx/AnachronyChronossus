// Command-marker tracks on the Chronossus board.
//
// Each of the 4 Command markers (2/3/4/5) walks its own ordered track of board
// positions. Some positions are SHARED between markers (they land on the same
// board spot), per the Chronossus solo board:
//
//   • Marker 3 — 5 own steps, shared with nobody.
//   • Marker 2 — a 5-step loop; every one of its steps is shared with 4 or 5.
//   • Marker 4 — 5 steps; steps 2 & 3 sit on marker 2's steps 3 & 2 (reverse dir).
//   • Marker 5 — 4 steps; steps 1,2,3 sit on marker 2's steps 4,5,1 (same dir);
//     step 4 is on its own.
//
// So the shared board positions are marker 2's five loop positions (m2p1..m2p5):
//   m2p2 == marker4 step3   m2p3 == marker4 step2   (4 traverses p3→p2, reversed)
//   m2p4 == marker5 step1   m2p5 == marker5 step2   m2p1 == marker5 step3
//
// A marker ADVANCES one step each time it is activated, looping back to step 1
// after its last step (step 1 is its start-of-game position). POSITIONS ARE
// PLACEHOLDERS — calibrate them in-app (the calibrate panel emits this literal).

import type { ChronossusActionId } from '../engine/bots/chronossus';

export type CommandNum = 2 | 3 | 4 | 5;

/** A distinct, calibratable board position on the Command-marker tracks. */
export interface TrackPos {
  key: string;
  /** Center [x, y] as a % of the board image. */
  pos: [number, number];
  /**
   * The action a modular tile slot triggers. Non-modular spots omit this and
   * resolve to the nearest printed Action space instead. Base-game default setup
   * (no expansion, no difficulty tweak): I = C01A Reboot, II = C02A Score,
   * III = C03A Energy Pack.
   */
  action?: ChronossusActionId;
  /** Display label for a modular tile slot (roman numeral I/II/III). */
  label?: string;
  /** Modular tile art code (C01A/C02A/C03A) for the tile image on the board. */
  tile?: string;
}

/**
 * The 14 distinct board positions. Shared positions (m2p1..m2p5) appear once and
 * are referenced by more than one marker's track below.
 */
export const CHRONOSSUS_TRACK_POSITIONS: TrackPos[] = [
  // Marker 3 — own row. Step 3 is modular tile slot II (C02A Score, +2 VP).
  { key: 'm3s1', pos: [6, 10.6] },
  { key: 'm3s2', pos: [17, 10.6] },
  { key: 'm3s3', pos: [27.8, 19.7], action: 'tile-score', label: 'II', tile: 'C02A' },
  { key: 'm3s4', pos: [39, 10.6] },
  { key: 'm3s5', pos: [50, 10.6] },
  // Marker 2 loop — every position shared with marker 4 or 5. m2p3 is modular
  // tile slot I (marker 4 step 2 / marker 2 step 3): C01A Reboot.
  { key: 'm2p1', pos: [39.1, 58.7] }, // marker 2 start; == marker 5 step 3
  { key: 'm2p2', pos: [28, 55.8] }, //   == marker 4 step 3
  { key: 'm2p3', pos: [27.9, 40.9], action: 'tile-reboot', label: 'I', tile: 'C01A' },
  { key: 'm2p4', pos: [49.9, 30.5] }, // == marker 5 start (step 1)
  { key: 'm2p5', pos: [49.8, 54.2] }, // == marker 5 step 2
  // Marker 4 own positions.
  { key: 'm4s1', pos: [16.9, 30.5] }, // marker 4 start
  { key: 'm4s4', pos: [6.1, 54] },
  { key: 'm4s5', pos: [5.8, 30.3] },
  // Modular tile slot III (marker 5 step 4): C03A Energy Pack (+1 Energy Core).
  { key: 'm5s4', pos: [39, 43.9], action: 'tile-energy-pack', label: 'III', tile: 'C03A' },
];

/** Look up a track position by key. */
export function trackPos(key: string): TrackPos | undefined {
  return CHRONOSSUS_TRACK_POSITIONS.find((p) => p.key === key);
}

/**
 * Each marker's ordered track: a list of position keys (step 1 = start). A marker
 * loops back to step 1 after its final step. Shared keys make markers meet.
 */
export const CHRONOSSUS_TRACKS: Record<CommandNum, string[]> = {
  3: ['m3s1', 'm3s2', 'm3s3', 'm3s4', 'm3s5'],
  2: ['m2p1', 'm2p2', 'm2p3', 'm2p4', 'm2p5'],
  4: ['m4s1', 'm2p3', 'm2p2', 'm4s4', 'm4s5'],
  5: ['m2p4', 'm2p5', 'm2p1', 'm5s4'],
};

export const COMMAND_NUMS: CommandNum[] = [2, 3, 4, 5];

/** Render width of the modular tile art (% of the board image). Calibratable. */
export const CHRONOSSUS_TILE_WIDTH = 9.5;

/** Render width of the Command markers (% of the board image). Calibratable. */
export const CHRONOSSUS_MARKER_WIDTH = 6.5;

/** Every marker starts at step 0 (its step-1 position). */
export function initialMarkerSteps(): Record<CommandNum, number> {
  return { 2: 0, 3: 0, 4: 0, 5: 0 };
}

/** The position key a marker currently sits on. */
export function markerPosKey(num: CommandNum, step: number): string {
  const track = CHRONOSSUS_TRACKS[num];
  return track[step % track.length];
}

/** Advance a marker one step (loops back to step 1 after the last). */
export function nextStep(num: CommandNum, step: number): number {
  return (step + 1) % CHRONOSSUS_TRACKS[num].length;
}
