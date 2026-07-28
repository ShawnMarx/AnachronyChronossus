// Per-phase display metadata: the rulebook name, the verbatim "overview" blurb
// shown at the top of each phase (from the Solo Opponents phase summaries), and
// the verbatim Chronobot rules box text where the rulebook gives one. Kept as
// data so each phase screen stays a thin body.

import type { Phase } from '../engine';

export interface PhaseMeta {
  /** Rulebook phase number (1–6). */
  number: number;
  /** Short phase name, e.g. "Preparation". */
  name: string;
  /** Verbatim rulebook overview of the phase (general, both players). */
  overview: string;
  /** Verbatim Chronobot-specific rules for this phase, if the rulebook gives any. */
  rules?: string;
}

export const PHASE_META: Partial<Record<Phase, PhaseMeta>> = {
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
      'Paradox phase – Players who excessively strained the Timeline with Warping ' +
      'have to roll for Paradoxes. This phase is skipped in the first Era.',
    rules:
      'The Chronobot rolls for Paradoxes last. If the Chronobot gains an Anomaly, ' +
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
      'In pre-Impact Eras, the Chronobot always powers up 6 Exosuits, while in ' +
      'post-Impact Eras, it powers up 4. The Chronobot neither gains nor spends ' +
      'Energy Cores or Water. Powered-up Exosuit markers are piled on top of each ' +
      'other on the upper right Hex-shaped slot.',
  },
  warp: {
    number: 4,
    name: 'Warp',
    overview:
      'Warp phase – Players may place Warp tiles on the current Timeline tile to ' +
      'bring assets from the future to the present.',
    rules:
      'Warping occurs in player order. For the Chronobot’s Warp, roll the Paradox ' +
      'die. Place Warp tiles for the Chronobot equal to the rolled number of ' +
      'Paradoxes. The Chronobot does not gain anything for its Warp tiles, and it ' +
      'does not matter which warp tile it places. You choose 0-2 Warp tiles to ' +
      'place as normal.',
  },
  actions: {
    number: 5,
    name: 'Action Rounds',
    overview:
      'Action rounds phase – Players alternate taking Actions on their Player ' +
      'boards and the Main board until everyone has passed.',
    rules:
      'On the Chronobot’s turn, roll the AI die. ① The Chronobot performs the ' +
      'Action shown above or below the token with that number, ② then advances the ' +
      'token to the next position. ③ If there are already two tokens there, move ' +
      'the top one to the next position prior to moving the active token.',
  },
  cleanup: {
    number: 6,
    name: 'Clean Up',
    overview:
      'Clean up phase – Retrieve Workers and Exosuits from the Action spaces, ' +
      'check for Impact and game end, and set the players’ Focus marker on the ' +
      'next Era.',
    rules:
      'Retrieve the Chronobot’s Exosuits along with your own, as normal. After the ' +
      'Impact, follow the usual procedure for flipping Collapsing Capital tiles.',
  },
};

/** Verbatim End-Game scoring rules (shown on the score screen). */
export const ENDGAME_RULES =
  'The Chronobot does not lose VPs for its Warp tiles that remain on the ' +
  'Timeline. It scores 1 VP per Breakthrough, plus 2 additional VPs for each ' +
  'complete shape set. If you have more points than the Chronobot, you win; ' +
  'otherwise, you lose.';
