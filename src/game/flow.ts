// Phase-flow orchestration for the Chronobot Era loop. Pure and UI-agnostic:
// it encodes the *sequence* of phases (and the two conditional branches the
// per-phase engine resolvers don't cover) so the phase screens and persistence
// share one source of truth.
//
// Sequence per Era:
//   Preparation(1) → Paradox(2) → Power Up(3) → Warp(4) → Action Rounds(5) →
//   Clean Up(6) → (next Era Preparation | End Game)
//
// Fractures of Time prefixes the whole game with a one-off Era Zero Warp Phase
// (setup → era0warp → Era 1 Preparation) and, because of it, does NOT skip Era 1's
// Paradox phase.
//
// The engine resolvers already advance the phases they own:
//   resolvePowerUp → warp, resolveWarp → actions, endParadoxPhase → powerup,
//   resolveCleanUp → cleanup. This module fills the connective transitions:
//   setup → preparation, preparation → paradox/powerup (Era-1 Paradox skip),
//   and cleanup → next Era / End Game.

import { engineFor } from '../engine';
import type { GameState, Phase } from '../engine';
import { isFracturesMode } from '../engine/bots/chronossus';

/** The ordered phases of a normal Era (rulebook Phase numbers 1–6). */
export const ERA_PHASE_SEQUENCE: Phase[] = [
  'preparation',
  'paradox',
  'powerup',
  'warp',
  'actions',
  'cleanup',
];

/**
 * Whether this game plays the Era Zero Warp Phase — Fractures of Time only:
 * "At the beginning of the game, before starting the regular round sequence for
 * Era 1, perform a Warp Phase (but no other Phases), placing the Warp tiles on the
 * Era Zero tile." (Fractures rulebook p.6)
 */
export function hasEraZeroWarp(state: GameState): boolean {
  return isFracturesMode(state.config.chronossusMode);
}

/**
 * Enter the first Era: from Setup to Preparation (Phase 1) of Era 1 — or, with
 * Fractures of Time, to the one-off Era Zero Warp Phase that precedes it. `era`
 * stays 1 throughout: Era Zero has a Timeline tile but is not an Era of the round
 * sequence, so only the screen calls itself Era 0.
 */
export function startFirstEra(state: GameState): GameState {
  if (hasEraZeroWarp(state)) {
    return {
      ...state,
      phase: 'era0warp',
      currentInstructions: [],
      log: [...state.log, '— Era Zero Warp Phase —'],
    };
  }
  return {
    ...state,
    phase: 'preparation',
    currentInstructions: [],
    log: [...state.log, '— Era 1 begins —'],
  };
}

/**
 * Whether the Paradox phase (Phase 2) is skipped this Era (normally always in Era 1).
 * With Fractures of Time, Era 1 DOES perform a Paradox phase — the Era Zero tile is
 * already in the past by then, with Warp tiles on it (Fractures rulebook p.6).
 */
export function paradoxSkipped(state: GameState): boolean {
  return state.era === 1 && !hasEraZeroWarp(state);
}

/**
 * How many past Timeline tiles the bot can be checked against in the Paradox phase —
 * the cap on its rolls. Normally Era − 1; with Fractures the Era Zero tile adds one.
 */
export function pastTimelineTiles(state: GameState): number {
  return Math.max(0, state.era - 1 + (hasEraZeroWarp(state) ? 1 : 0));
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
  return state.endgameTriggered || state.era >= engineFor(state.config.bot).maxEraFor(state.config);
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
