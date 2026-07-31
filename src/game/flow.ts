// Phase-flow orchestration for the Chronobot Era loop. Pure and UI-agnostic:
// it encodes the *sequence* of phases (and the two conditional branches the
// per-phase engine resolvers don't cover) so the phase screens and persistence
// share one source of truth.
//
// Sequence per Era:
//   Preparation(1) → Paradox(2) → Power Up(3) → Warp(4) → Action Rounds(5) →
//   Clean Up(6) → (next Era Preparation | End Game)
//
// The engine resolvers already advance the phases they own:
//   resolvePowerUp → warp, resolveWarp → actions, endParadoxPhase → powerup,
//   resolveCleanUp → cleanup. This module fills the connective transitions:
//   setup → preparation, preparation → paradox/powerup (Era-1 Paradox skip),
//   and cleanup → next Era / End Game.

import { engineFor } from '../engine';
import type { GameState, Phase } from '../engine';

/** The ordered phases of a normal Era (rulebook Phase numbers 1–6). */
export const ERA_PHASE_SEQUENCE: Phase[] = [
  'preparation',
  'paradox',
  'powerup',
  'warp',
  'actions',
  'cleanup',
];

/** Enter the first Era: from Setup to Preparation (Phase 1) of Era 1. */
export function startFirstEra(state: GameState): GameState {
  return {
    ...state,
    phase: 'preparation',
    currentInstructions: [],
    log: [...state.log, '— Era 1 begins —'],
  };
}

/** Whether the Paradox phase (Phase 2) is skipped this Era (always in Era 1). */
export function paradoxSkipped(state: GameState): boolean {
  return state.era === 1;
}

/**
 * Advance out of Preparation (Phase 1). "No changes for Chronobot" — the phase is
 * purely informational — so this just moves to Paradox (Phase 2), or straight to
 * Power Up (Phase 3) in Era 1, where the Paradox phase is skipped.
 */
export function advanceFromPreparation(state: GameState): GameState {
  const next: Phase = paradoxSkipped(state) ? 'powerup' : 'paradox';
  return {
    ...state,
    phase: next,
    currentInstructions: [],
    log: [...state.log, `Preparation done (Era ${state.era}).`],
  };
}

/**
 * Whether the game ends after this Era's Clean Up: the player triggered the End
 * Game (Era 5–6) or we have finished the final Era.
 */
export function isFinalEra(state: GameState): boolean {
  return state.endgameTriggered || state.era >= engineFor(state.config.bot).MAX_ERA;
}

/**
 * After Clean Up (Phase 6): move to the End Game (scoring) if this was the final
 * Era, otherwise start the next Era at Preparation (Phase 1).
 */
export function finishEra(state: GameState): GameState {
  if (isFinalEra(state)) {
    return {
      ...state,
      phase: 'endgame',
      finished: true,
      log: [...state.log, `— End Game (after Era ${state.era}) —`],
    };
  }
  return engineFor(state.config.bot).startNextEra(state);
}
