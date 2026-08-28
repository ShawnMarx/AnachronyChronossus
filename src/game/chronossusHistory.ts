// History effects for the Chronossus's module-only state.
//
// `summarizeTurn` (BoardExplorer) was written against the Chronobot's state, so it cannot
// see anything a Chronossus module adds — which is why a Power Pack used to log its Energy
// Core but not its Flux Core, and an Assimilate that took a Technology logged nothing at
// all. Pure and unit-tested; the view appends these to every committed turn.
//
// When a new module adds tracked state, extend this (and its tests) — see CLAUDE.md.

import type { ChronossusState } from '../engine';
import { isMsg, msg, plural, type Msg } from '../engine/message';
import { adventureCard } from '../data/adventureCards';
import { UPGRADE_SLOTS } from '../engine/bots/pioneers';
import {
  botVpAt as doomsdaySlotVp,
  DOOMSDAY_BOTTOM_SLOT,
  DOOMSDAY_TOP_SLOT,
} from '../engine/bots/doomsday';

const WORKER_KEYS = ['genius', 'administrator', 'engineer', 'scientist'] as const;
const RESOURCE_KEYS = ['titanium', 'uranium', 'gold', 'neutronium'] as const;

/**
 * Append the Chronossus/Fractures/Hypersync deltas of one turn to `effects`
 * (mutated in place, so it stays in the order the view builds).
 */
export function summarizeChronossusExtras(
  pre: ChronossusState,
  post: ChronossusState,
  effects: Msg[],
  /** Guardians: this turn's placement went onto the Guardian board's own space. The state
   *  diff can't show that — both routes just decrement `guardians.powered`. */
  opts: { guardianBoard?: boolean } = {},
): Msg[] {
  // Fractures — Flux Pool. Only gains: a Blink's spent Core is already reported by the
  // Blink line itself, and Casings moving to the set-aside pile is bookkeeping.
  const flux = (post.fluxPool?.cores ?? 0) - (pre.fluxPool?.cores ?? 0);
  if (flux > 0) effects.push(plural('hist.fluxCore', flux));

  // Fractures — Technology cards (3 VP each at the end).
  const tech = (post.technologies ?? 0) - (pre.technologies ?? 0);
  if (tech > 0) {
    effects.push(plural('hist.technology', tech));
  }

  // Fractures — Operators. An Operator arrives as a wildcard Worker, so the shared
  // summarizer reports it as a plain "Recruited <type>": say what it actually is, and
  // which column it filled.
  //
  // Neither delta survives an Operator that COMPLETES the +5 VP Worker set: the set
  // discards one of each, so the count goes 0 → 1 → 0 and the column nets out too. What
  // does survive is the column key `operatorSlots` gained — it stays behind at 0.
  const ops = (post.operators ?? 0) - (pre.operators ?? 0);
  const opsColumn = WORKER_KEYS.find(
    (w) =>
      (post.operatorSlots?.[w] ?? 0) > (pre.operatorSlots?.[w] ?? 0) ||
      (post.operatorSlots != null && w in post.operatorSlots && !(w in (pre.operatorSlots ?? {}))),
  );
  if (ops > 0 || opsColumn) {
    const col = opsColumn ?? WORKER_KEYS.find((w) => post.workers[w] > pre.workers[w]);
    const line = col
      ? msg('hist.operator.column', { column: msg(`piece.${col}`) })
      : msg('hist.operator');
    // Which line to replace is decided by its KEY, not by the English it renders as — a
    // reworded default must never change what this finds (the `historyLabels.ts` rule).
    const i = effects.findIndex((e) => isMsg(e) && e.key === 'hist.recruited');
    if (i >= 0) effects[i] = line;
    else effects.push(line);
  }

  // Guardians — enlisted Guardians (permanent) and the Worker an Acquire Guardian spent.
  // `owned` only ever rises; `powered` is per-Era bookkeeping and isn't worth a line.
  const gained = (post.guardians?.owned ?? 0) - (pre.guardians?.owned ?? 0);
  if (gained > 0) {
    effects.push(plural('hist.guardianAcquired', gained));
    // The Worker branch spends one; the shared summarizer has no idea why it went.
    const spent = WORKER_KEYS.find((w) => post.workers[w] < pre.workers[w]);
    if (spent) effects.push(msg('hist.guardianWorkerSpent', { worker: msg(`piece.${spent}`) }));
  }
  // A Guardian placed — because no Exosuit was left, or onto its own Guardian board space
  // when the Action spaces ran out. The Exosuit count doesn't move either way, so nothing
  // else in the summary would mention it.
  const guardiansPlaced = (pre.guardians?.powered ?? 0) - (post.guardians?.powered ?? 0);
  if (guardiansPlaced > 0 && gained === 0) {
    // Naming the board is a clause, not a word, so it is its own key (D2).
    effects.push(
      plural(
        opts.guardianBoard ? 'hist.guardianPlacedBoard' : 'hist.guardianPlaced',
        guardiansPlaced,
      ),
    );
  }

  // Pioneers — the Adventure. The card taken is the headline; the Upgrade board's Power
  // change and the VP-token fallback are the state the player can't otherwise see.
  const advBefore = pre.pioneers?.adventures ?? 0;
  const advAfter = post.pioneers?.adventures ?? 0;
  if (advAfter > advBefore) {
    const taken = post.pioneers?.decks
      ? [...post.pioneers.decks['5+'].discard, ...post.pioneers.decks['10+'].discard].slice(-1)[0]
      : undefined;
    const card = taken ? adventureCard(taken) : undefined;
    effects.push(
      card
        ? msg('hist.adventure.card', { card: card.name, power: card.power })
        : msg('hist.adventure'),
    );
  }
  if (pre.pioneers && post.pioneers) {
    const upgraded = RESOURCE_KEYS.find(
      (r) => !pre.pioneers!.upgraded[r] && post.pioneers!.upgraded[r],
    );
    if (upgraded) {
      const gain = UPGRADE_SLOTS.find((sl) => sl.resource === upgraded)?.power ?? 0;
      const line = msg('hist.powerUpgrade', {
        resource: msg(`ui.pieceInline.${upgraded}`),
        power: gain,
      });
      // The shared summarizer sees the Resource leave and calls it "Discarded uranium" —
      // it wasn't discarded, it was spent onto the board. Replace that line rather than
      // printing both (the same trick the Operator line uses). Matched on key + param,
      // never on the rendered English.
      const i = effects.findIndex(
        (e) =>
          isMsg(e) &&
          e.key === 'hist.discarded.one' &&
          isMsg(e.params?.resource as Msg) &&
          (e.params!.resource as Msg).key === `ui.pieceInline.${upgraded}`,
      );
      if (i >= 0) effects[i] = line;
      else effects.push(line);
    }
    const tokens = post.pioneers.vpTokens - pre.pioneers.vpTokens;
    if (tokens > 0) {
      effects.push(msg('hist.powerUpgrade.tokens', { n: tokens }));
    }
  }

  // Doomsday — the Experiment. Its two steps are the state the player cannot otherwise
  // see: the Experiment count feeds the "Completed Experiments" Solo Objective, and the
  // tracker's slot decides the VP every future Experiment earns.
  const expBefore = pre.doomsday?.experimentsCompleted ?? 0;
  const expAfter = post.doomsday?.experimentsCompleted ?? 0;
  if (expAfter > expBefore) {
    effects.push(msg('hist.experiment', { total: expAfter }));
  }
  if (pre.doomsday && post.doomsday && post.doomsday.botSlot !== pre.doomsday.botSlot) {
    const name = msg(
      post.doomsday.botTracker === 'save-earth' ? 'ui.track.saveEarth' : 'ui.track.sealFate',
    );
    const vp = doomsdaySlotVp(post.doomsday.botSlot);
    effects.push(
      vp > 0
        ? msg('hist.doomsdayTracker.vp', { tracker: name, vp })
        : msg('hist.doomsdayTracker', { tracker: name }),
    );
    if (post.doomsday.botSlot === DOOMSDAY_TOP_SLOT) {
      effects.push(msg('hist.earthSaved'));
    } else if (post.doomsday.botSlot === DOOMSDAY_BOTTOM_SLOT) {
      effects.push(msg('hist.fateSealed'));
    }
  }

  // Hypersync (HFA) — Solo Hypersync tiles placed on / retrieved from the Timeline.
  const hsBefore = pre.hypersyncTiles.length;
  const hsAfter = post.hypersyncTiles.length;
  if (hsAfter > hsBefore) effects.push(msg('hist.hypersyncPlaced'));
  else if (hsAfter < hsBefore) effects.push(msg('hist.hypersyncRetrieved'));

  return effects;
}
