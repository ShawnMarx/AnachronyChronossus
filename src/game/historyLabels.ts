// The History label contract — what a turn's one-line label MEANS, structurally.
//
// Two places used to decide that by reading the label's English prose: the pane's
// "this phase-entry row is superseded by the next row" rule parsed `Era 2 · → Warp` with
// a regex, and the Chronossus's "turns this Era" count filtered on
// `/You passed|Power Up|Warp|Paradox|· → /`. Both broke the moment a label could be in
// another language — and both were already fragile, since a reworded label silently
// changed a COUNT the player sees.
//
// So a label is a descriptor with a known key, and these predicates read the key. The
// prose paths are kept as a fallback for LEGACY entries: a game already in progress when
// this shipped has finished English sentences on its undo stack (see `Text` in
// `src/engine/message.ts`), and its History has to keep behaving.

import type { HistoryEntry } from './undo';
import { isMsg } from '../engine/message';

/**
 * Label keys. Every phase-result label MUST carry `era` and `phase` params, because
 * `isSupersededPhaseEntry` pairs it with the `enteredPhase` row that precedes it.
 */
export const HISTORY_LABEL = {
  /** Entering a phase: "Era 2 · → Warp". Params: `{ era, phase }`. */
  enteredPhase: 'hist.label.enteredPhase',
  /** What a phase did: "Era 2 · Warp: placed 1". Params: `{ era, phase, … }`. */
  phaseResult: 'hist.label.phaseResult',
  /**
   * A bot Action turn — the only entry that counts as a "turn this Era". Two keys,
   * because whether the turn scored VP changes the sentence rather than a word in it;
   * `isBotTurnEntry` allowlists both.
   */
  botTurn: 'hist.label.botTurn',
  botTurnVp: 'hist.label.botTurn.vp',
  youPassed: 'hist.label.youPassed',
  botPassed: 'hist.label.botPassed',
  chronossusPassed: 'hist.label.chronossusPassed',
  botTimeTravelPass: 'hist.label.botTimeTravelPass',
  endGame: 'hist.label.endGame',
} as const;

/** The label's key, or null for a legacy saved sentence. */
export function labelKey(entry: HistoryEntry): string | null {
  return isMsg(entry.label) ? entry.label.key : null;
}

function labelParam(entry: HistoryEntry, name: string): string | number | null {
  if (!isMsg(entry.label)) return null;
  const value = entry.label.params?.[name];
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

/**
 * A committed bot Action turn — what the Action Rounds "Bot turns" count means.
 *
 * An ALLOWLIST on the key, where the old prose filter was a blocklist. A blocklist counts
 * anything it forgot to exclude, which is how the phase-entry rows came to be counted as
 * turns in the first place.
 */
export function isBotTurnEntry(entry: HistoryEntry): boolean {
  const key = labelKey(entry);
  if (key != null) return key === HISTORY_LABEL.botTurn || key === HISTORY_LABEL.botTurnVp;
  // Legacy prose fallback — the original blocklist, unchanged.
  return !/You passed|Power Up|Warp|Paradox|· → /.test(String(entry.label));
}

/**
 * Entering a phase commits "Era 1 · → Warp", and the phase's own result then commits
 * "Era 1 · Warp: placed 1" — so Power Up and Warp each showed twice, once with nothing on
 * it. The bare arrow row is dropped when the very next entry reports what that same phase
 * did; a phase where nothing happened keeps its arrow row, since that is its only trace.
 *
 * This is display only: both entries stay on the undo stack, so every phase move is still
 * a separate ↶ Undo step.
 */
export function isSupersededPhaseEntry(
  entry: HistoryEntry,
  next: HistoryEntry | undefined,
): boolean {
  if (entry.effects.length > 0 || entry.die != null) return false;
  if (!next) return false;
  const key = labelKey(entry);
  if (key != null) {
    if (key !== HISTORY_LABEL.enteredPhase) return false;
    if (labelKey(next) !== HISTORY_LABEL.phaseResult) return false;
    return (
      labelParam(next, 'era') === labelParam(entry, 'era') &&
      labelParam(next, 'phase') === labelParam(entry, 'phase')
    );
  }
  // Legacy prose fallback.
  const arrow = /^(Era \d+) · → (.+)$/.exec(String(entry.label));
  if (!arrow) return false;
  return String(next.label).startsWith(`${arrow[1]} · ${arrow[2]}:`);
}
