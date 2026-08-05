// Per-phase display metadata for the Chronossus, mirroring phaseMeta.ts but with
// Chronossus-specific overview/rules text (Energy Pool Power Up, etc.). Kept as
// data so each phase screen stays a thin body.

import type { Phase } from '../engine';
import type { PhaseMeta } from './phaseMeta';

export const CHRONOSSUS_PHASE_META: Partial<Record<Phase, PhaseMeta>> = {
  preparation: {
    number: 1,
    name: 'Preparation',
    overview:
      'Preparation phase – Reveal the Superproject above the next Timeline tile, ' +
      'shift the building stacks, fill up the supply of Workers and Resources ' +
      'available for this Era.',
  },
  paradox: {
    number: 2,
    name: 'Paradox',
    overview:
      'Paradox phase – Players who strained the Timeline with Warping roll for ' +
      'Paradoxes. Skipped in the first Era.',
    rules:
      'The Chronossus rolls for Paradoxes last. If the Chronossus gains an Anomaly, ' +
      'it stops rolling (like you would), then removes any one Warp tile from the ' +
      'Timeline tile where it has the most Warp tiles (oldest if tied). If it would ' +
      'gain an Anomaly when it already has 3 Anomalies, it does not receive another ' +
      'one, nor does it remove a Warp tile.',
  },
  powerup: {
    number: 3,
    name: 'Power Up',
    overview:
      'Power up phase – Players may power up Exosuits, allowing their Workers to ' +
      'perform Actions on the Main board.',
    rules:
      'When it is the Chronossus’s turn to decide, draw 3 tokens from its Energy ' +
      'Pool. Before the Impact it powers up 3+X Exosuits (max 6); after the Impact, ' +
      '2+X (max 4), where X = the non-exhausted Energy Cores drawn. Then return 1 ' +
      'drawn Exhausted Energy Core to the Pool and remove the other drawn tokens ' +
      'from the game.',
  },
  warp: {
    number: 4,
    name: 'Warp',
    overview:
      'Warp phase – Players may place Warp tiles on the current Timeline tile to ' +
      'bring assets from the future to the present.',
    rules:
      'Warping occurs in player order. For the Chronossus’s Warp, roll the Paradox ' +
      'die. Place Warp tiles for the Chronossus equal to the rolled number of ' +
      'Paradoxes. The Chronossus does not gain anything for its Warp tiles, and it ' +
      'does not matter which warp tile it places. You choose 0-2 Warp tiles to ' +
      'place as normal.',
  },
  actions: {
    number: 5,
    name: 'Action Rounds',
    overview:
      'Action rounds phase – Players alternate taking Actions until everyone has ' +
      'passed.',
    rules:
      'On the Chronossus’s turn, roll the AI die. It performs the Action shown ' +
      'above or below (possibly on an Action tile) the token with that number, then ' +
      'the token advances. If a token lands on an Autoleap symbol, that tile’s ' +
      'Action resolves immediately and the token advances one more.',
  },
  cleanup: {
    number: 6,
    name: 'Clean Up',
    overview:
      'Clean up phase – Retrieve Workers and Exosuits, check for Impact and game ' +
      'end, and set the players’ Focus marker on the next Era.',
    rules:
      'Just like with the Chronobot, retrieve the Chronossus’s Exosuits along with ' +
      'your own. After the Impact, flip Collapsing Capital tiles normally.',
  },
};

/** Verbatim End-Game scoring rules for the Chronossus (score screen). */
export const CHRONOSSUS_ENDGAME_RULES =
  'In addition to your points collected during the game, you score points for the ' +
  'highest level you reached on each Solo Objective. The Chronossus does not lose ' +
  'VPs for its Warp tiles remaining on the Timeline. It scores 1 VP per Breakthrough, ' +
  'plus 2 additional VPs for each complete shape set. If you have more points than ' +
  'the Chronossus, you win; otherwise, you lose.';
