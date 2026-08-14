// History effects for the Chronossus's module-only state.
//
// `summarizeTurn` (BoardExplorer) was written against the Chronobot's state, so it cannot
// see anything a Chronossus module adds — which is why a Power Pack used to log its Energy
// Core but not its Flux Core, and an Assimilate that took a Technology logged nothing at
// all. Pure and unit-tested; the view appends these to every committed turn.
//
// When a new module adds tracked state, extend this (and its tests) — see CLAUDE.md.

import type { ChronossusState } from '../engine';

const WORKER_KEYS = ['genius', 'administrator', 'engineer', 'scientist'] as const;

/**
 * Append the Chronossus/Fractures/Hypersync deltas of one turn to `effects`
 * (mutated in place, so it stays in the order the view builds).
 */
export function summarizeChronossusExtras(
  pre: ChronossusState,
  post: ChronossusState,
  effects: string[],
  /** Guardians: this turn's placement went onto the Guardian board's own space. The state
   *  diff can't show that — both routes just decrement `guardians.powered`. */
  opts: { guardianBoard?: boolean } = {},
): string[] {
  // Fractures — Flux Pool. Only gains: a Blink's spent Core is already reported by the
  // Blink line itself, and Casings moving to the set-aside pile is bookkeeping.
  const flux = (post.fluxPool?.cores ?? 0) - (pre.fluxPool?.cores ?? 0);
  if (flux > 0) effects.push(`+${flux} Flux Core${flux === 1 ? '' : 's'} to the Flux Pool`);

  // Fractures — Technology cards (3 VP each at the end).
  const tech = (post.technologies ?? 0) - (pre.technologies ?? 0);
  if (tech > 0) {
    effects.push(`+${tech} Technology card${tech === 1 ? '' : 's'} (3 VP each at the end)`);
  }

  // Fractures — Operators. An Operator arrives as a wildcard Worker, so the shared
  // summarizer reports it as a plain "Recruited <type>": say what it actually is, and
  // which column it filled.
  const ops = (post.operators ?? 0) - (pre.operators ?? 0);
  if (ops > 0) {
    const col = WORKER_KEYS.find((w) => post.workers[w] > pre.workers[w]);
    const line = `Recruited an Operator${col ? ` into the ${col} column` : ''} (wildcard Worker)`;
    const i = effects.findIndex((e) => e.startsWith('Recruited '));
    if (i >= 0) effects[i] = line;
    else effects.push(line);
  }

  // Guardians — enlisted Guardians (permanent) and the Worker an Acquire Guardian spent.
  // `owned` only ever rises; `powered` is per-Era bookkeeping and isn't worth a line.
  const gained = (post.guardians?.owned ?? 0) - (pre.guardians?.owned ?? 0);
  if (gained > 0) {
    effects.push(`Acquired ${gained} Guardian${gained === 1 ? '' : 's'}`);
    // The Worker branch spends one; the shared summarizer has no idea why it went.
    const spent = WORKER_KEYS.find((w) => post.workers[w] < pre.workers[w]);
    if (spent) effects.push(`Spent a ${spent} to acquire it`);
  }
  // A Guardian placed — because no Exosuit was left, or onto its own Guardian board space
  // when the Action spaces ran out. The Exosuit count doesn't move either way, so nothing
  // else in the summary would mention it.
  const guardiansPlaced = (pre.guardians?.powered ?? 0) - (post.guardians?.powered ?? 0);
  if (guardiansPlaced > 0 && gained === 0) {
    const where = opts.guardianBoard ? ' on the Guardian board' : '';
    effects.push(
      `Placed ${guardiansPlaced} Guardian${guardiansPlaced === 1 ? '' : 's'}${where}`,
    );
  }

  // Hypersync (HFA) — Solo Hypersync tiles placed on / retrieved from the Timeline.
  const hsBefore = pre.hypersyncTiles.length;
  const hsAfter = post.hypersyncTiles.length;
  if (hsAfter > hsBefore) effects.push('Solo Hypersync tile placed on the Timeline');
  else if (hsAfter < hsBefore) effects.push('Solo Hypersync tile retrieved');

  return effects;
}
