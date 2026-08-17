// soloEngine.ts — the thin, shared seam between the Era-loop flow and each bot.
//
// Per-phase and per-action turn logic still lives in each bot's own module as
// pure functions (see the note in BotModule.ts); this interface is deliberately
// NOT a full planTurn/endTurn abstraction. It captures only the *flow-level*
// operations that `src/game/flow.ts` drives identically for any solo opponent —
// the connective sequencing of the Era loop. It grows as new bots need shared
// seams; anything bot-specific stays in the bot module and is dispatched by the
// view that owns that bot.

import type { BotModeId, GameConfig } from '../types';
import type { GameState } from '../state';

export interface SoloEngine {
  readonly id: BotModeId;
  /** Highest Era number before the game always ends (7 in the base game). */
  readonly MAX_ERA: number;
  /**
   * The last Era for a specific game's config. A module can re-cut the Timeline —
   * Fractures of Time runs Eras 1–5 (plus its Era Zero tile) — so the flow asks per
   * game rather than reading the bot-wide `MAX_ERA`.
   */
  maxEraFor(config: GameConfig): number;
  /**
   * Reset per-Era state and advance from Clean Up (Phase 6) into the next Era's
   * Preparation (Phase 1). Each bot resets its own state slice, so this differs
   * per opponent even though the surrounding sequence is shared.
   */
  startNextEra(state: GameState): GameState;
}

const engines = new Map<BotModeId, SoloEngine>();

/** Register a bot's flow-level engine. Called once per bot at module load. */
export function registerEngine(engine: SoloEngine): void {
  engines.set(engine.id, engine);
}

/** Look up the flow-level engine for the bot driving `state.config.bot`. */
export function engineFor(id: BotModeId): SoloEngine {
  const engine = engines.get(id);
  if (!engine) throw new Error(`No solo engine registered for "${id}"`);
  return engine;
}

/** Whether a flow-level engine is registered for `id` (e.g. scaffolded bots aren't). */
export function hasEngine(id: BotModeId): boolean {
  return engines.has(id);
}
