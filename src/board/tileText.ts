// tileText.ts — the app-voice descriptions of a modular Action tile.
//
// The verbatim rulebook text lives in `CHRONOSSUS_TILES[code].rule` and is what the 📖 box
// shows; these two are the app's own summaries — the one-line Command-view label and the
// expanded line inside the tile dialog.
//
// Kept out of the view (and pure) so they can be unit-tested: Pioneers shipped C09/C10 with
// no branch here, so tapping an Adventure tile read "The Chronossus does nothing this turn"
// — the fallback meant for Reboot. Every new module's tile must add BOTH entries.

import type { ChronossusActionId } from '../engine/bots/chronossus';
import { tileEffect } from './chronossusTiles';

/**
 * One-line description per in-play tile action (the Command view / tile tooltip).
 *
 * The English lives here, as it always has; `ui.tileDesc.<action>` is the override key a
 * locale file supplies. `tileDescription()` is what callers should use.
 */
export const TILE_DESC: Partial<Record<ChronossusActionId, string>> = {
  'tile-reboot': 'Reboot: the Chronossus does nothing',
  'tile-score': 'Score: +2 VP',
  'tile-energy-pack': 'Energy Pack: +1 Energy Core',
  'tile-assimilate': 'Assimilate: roll the shape die — Operator + Flux Core, or a Technology',
  'tile-extract': 'Extract: +2 Flux Cores and +2 Energy Cores',
  'tile-power-pack': 'Power Pack: +1 Energy Core and +1 Flux Core',
  'tile-acquire-guardian':
    'Acquire Guardian: World Council + the leftmost Guardian free, or spend a Worker',
  'tile-adventure':
    'Adventure: draw 2 cards (10+ deck at 9 Power), take the highest it meets, then Power Upgrade',
  'tile-experiment-1':
    'Level 1 Experiment: execute a marked Level 1 Experiment, then mark another for later',
  'tile-experiment-2':
    'Level 2 Experiment: execute a marked Level 2 Experiment, then mark another for later',
};

/**
 * One tile action's one-liner, translated. `translate` is optional for the same reason
 * every other pure helper's is: a caller outside React (and the unit tests) gets English.
 */
export function tileDescription(
  action: ChronossusActionId,
  translate?: (key: string) => string,
): string | undefined {
  const english = TILE_DESC[action];
  if (english == null) return undefined;
  const key = `ui.tileDesc.${action}`;
  const hit = translate?.(key);
  return hit && hit !== key ? hit : english;
}

/**
 * English for every clause `tileInstruction` assembles. It stays here — the file the
 * text has always lived in — and `surface.ts` derives the publishable keys from it, so a
 * new clause joins the translatable surface with the branch that added it.
 */
export const TILE_INSTR_EN: Record<string, string> = {
    'ui.tileInstr.assimilate':
      'Assimilates — roll the Research shape die: Circle, it recruits an Operator and ' +
      'gains 1 Flux Core; Triangle, it takes a Technology card (secondary stack); ' +
      'Square, whichever it has fewer of (Operator if tied). An Operator is a wildcard ' +
      'Worker — it fills the topmost empty space of the Worker collection (with none ' +
      'left in the Valley it is a Failed Action for +1 VP)',
    'ui.tileInstr.adventure':
      "performs an Adventure — an Exosuit onto the Adventure board's hex pool and a Path " +
      'marker on the topmost free Power slot, then it draws 2 Adventure cards (from the ' +
      '10+ deck at 9 or more Power, otherwise the 5+ deck), rolls the Adventure die, and ' +
      'takes the card with the highest Power requirement it meets (just +1 VP if it meets ' +
      'neither). Then it fulfils a Power Upgrade',
    'ui.tileInstr.experiment':
      'executes a Level {level} Experiment — it takes the leftmost one carrying ' +
      'one of its Path markers and discards that marker, then, unless the Doomsday tracks ' +
      'are locked, moves its own tracker one step and takes the VP printed there. Then it ' +
      'prepares for Experimentation, putting a Path marker on an unmarked face-up ' +
      'Experiment (Level 1 before Level 2, furthest in the past to break a tie, never the ' +
      'one under the next Era). Either step can fail on its own, and a failed step is ' +
      'simply skipped',
    'ui.tileInstr.vp': 'scores +{n} VP',
    'ui.tileInstr.energyCore': 'adds {n} non-exhausted Energy Core to its Energy Pool',
    'ui.tileInstr.energyCores': 'adds {n} non-exhausted Energy Cores to its Energy Pool',
    'ui.tileInstr.fluxCore': 'adds {n} Flux Core to its Flux Pool',
    'ui.tileInstr.fluxCores': 'adds {n} Flux Cores to its Flux Pool',
    'ui.tileInstr.acquireGuardian':
      'acquires a Guardian — an Exosuit onto the World Council space (becoming First ' +
      'Player) and the leftmost available Guardian for free, or, if that space is taken, ' +
      'a spent Worker instead',
    'ui.tileInstr.join': ' and ',
    'ui.tileInstr.frame': 'The Chronossus {parts}.',
    'ui.tileInstr.nothing':
      'The Chronossus does nothing this turn — its Command marker still advances.',
    'ui.tileInstr.autoleap':
      ' Its Command marker then advances one EXTRA step (Autoleap).',
  };

/**
 * The expanded description shown in a tile's dialog.
 *
 * Assembled from one clause per effect, so a tile that both scores and gains reads as one
 * sentence. Each clause is its own key with its own params — a translator can reorder the
 * words inside a clause, and `tileInstr.join` / `tileInstr.frame` decide how the clauses
 * come together, which differs by language. `translate` is optional: the unit tests and
 * any non-React caller get the English below.
 */
export function tileInstruction(
  code: string,
  translate?: (key: string, params?: Record<string, string | number>) => string,
): string {
  const eff = tileEffect(code);
  const t = (key: string, params?: Record<string, string | number>): string => {
    const hit = translate?.(key, params);
    if (hit != null && hit !== key) return hit;
    // Interpolate the English fallback the same way `t()` would.
    return (TILE_INSTR_EN[key] ?? key).replace(/\{(\w+)\}/g, (whole, name: string) =>
      params && name in params ? String(params[name]) : whole,
    );
  };

  const parts: string[] = [];
  if (eff.assimilate) parts.push(t('ui.tileInstr.assimilate'));
  // Pioneers: listed BEFORE the flat gains, so the B sides read "performs an Adventure …
  // and scores +1 VP" rather than leading with the bonus. Without this branch the A sides
  // have no `parts` at all and fall through to the Reboot "does nothing" line.
  if (eff.adventure) parts.push(t('ui.tileInstr.adventure'));
  // Doomsday: like the Adventure, listed BEFORE the flat gains so the B sides read
  // "executes a Level 2 Experiment ... and scores +1 VP" rather than leading with the bonus.
  if (eff.experiment) parts.push(t('ui.tileInstr.experiment', { level: eff.experiment }));
  if (eff.vp) parts.push(t('ui.tileInstr.vp', { n: eff.vp }));
  if (eff.energyCores)
    parts.push(
      t(eff.energyCores === 1 ? 'ui.tileInstr.energyCore' : 'ui.tileInstr.energyCores', {
        n: eff.energyCores,
      }),
    );
  if (eff.fluxCores)
    parts.push(
      t(eff.fluxCores === 1 ? 'ui.tileInstr.fluxCore' : 'ui.tileInstr.fluxCores', {
        n: eff.fluxCores,
      }),
    );
  if (eff.acquireGuardian) parts.push(t('ui.tileInstr.acquireGuardian'));

  let s = parts.length
    ? t('ui.tileInstr.frame', { parts: parts.join(t('ui.tileInstr.join')) })
    : t('ui.tileInstr.nothing');
  if (eff.autoleap) s += t('ui.tileInstr.autoleap');
  return s;
}
