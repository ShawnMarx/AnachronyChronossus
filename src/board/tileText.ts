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

/** One-line description per in-play tile action (the Command view / tile tooltip). */
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
};

/** The expanded description shown in a tile's dialog. */
export function tileInstruction(code: string): string {
  const eff = tileEffect(code);
  const parts: string[] = [];
  if (eff.assimilate)
    parts.push(
      'Assimilates — roll the Research shape die: Circle, it recruits an Operator and ' +
        'gains 1 Flux Core; Triangle, it takes a Technology card (secondary stack); ' +
        'Square, whichever it has fewer of (Operator if tied). An Operator is a wildcard ' +
        'Worker — it fills the topmost empty space of the Worker collection (with none ' +
        'left in the Valley it is a Failed Action for +1 VP)',
    );
  // Pioneers: listed BEFORE the flat gains, so the B sides read "performs an Adventure …
  // and scores +1 VP" rather than leading with the bonus. Without this branch the A sides
  // have no `parts` at all and fall through to the Reboot "does nothing" line.
  if (eff.adventure)
    parts.push(
      "performs an Adventure — an Exosuit onto the Adventure board's hex pool and a Path " +
        'marker on the topmost free Power slot, then it draws 2 Adventure cards (from the ' +
        '10+ deck at 9 or more Power, otherwise the 5+ deck), rolls the Adventure die, and ' +
        'takes the card with the highest Power requirement it meets (just +1 VP if it meets ' +
        'neither). Then it fulfils a Power Upgrade',
    );
  if (eff.vp) parts.push(`scores +${eff.vp} VP`);
  if (eff.energyCores)
    parts.push(
      `adds ${eff.energyCores} non-exhausted Energy Core${eff.energyCores === 1 ? '' : 's'} to its Energy Pool`,
    );
  if (eff.fluxCores)
    parts.push(
      `adds ${eff.fluxCores} Flux Core${eff.fluxCores === 1 ? '' : 's'} to its Flux Pool`,
    );
  if (eff.acquireGuardian)
    parts.push(
      'acquires a Guardian — an Exosuit onto the World Council space (becoming First ' +
        'Player) and the leftmost available Guardian for free, or, if that space is taken, ' +
        'a spent Worker instead',
    );
  let s = parts.length
    ? `The Chronossus ${parts.join(' and ')}.`
    : 'The Chronossus does nothing this turn — its Command marker still advances.';
  if (eff.autoleap) s += ' Its Command marker then advances one EXTRA step (Autoleap).';
  return s;
}
