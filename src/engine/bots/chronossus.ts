import type { GameState, Instruction } from '../state';
import type { BotModule } from './BotModule';

/**
 * The Chronossus automa — the primary opponent this app targets.
 *
 * NOTE: This is a scaffold. The real Chronossus turn structure (deck-driven
 * action selection, resource wheels, era advancement, expansion hooks) will be
 * implemented here incrementally against the official solo rulebook.
 */
export const chronossus: BotModule = {
  id: 'chronossus',
  name: 'Chronossus',
  description: 'The Chronossus automa solo opponent.',
  supportedExpansions: ['base', 'exosuit-command', 'doomsday', 'fractures-of-time'],

  setup() {
    return {
      // TODO: shuffle the Chronossus action deck, seed starting resources, etc.
      deck: [] as unknown[],
    };
  },

  planTurn(state: GameState): Instruction[] {
    // TODO: draw the top Chronossus card and translate it into instructions.
    const placeholder: Instruction[] = [
      {
        id: `era-${state.era}-draw`,
        text: 'Draw the top Chronossus card and reveal it.',
        detail: 'Turn logic not yet implemented.',
        requiresInput: true,
      },
    ];
    return placeholder;
  },

  endTurn(state: GameState): GameState {
    return {
      ...state,
      era: state.era + 1,
      currentTurn: [],
      log: [...state.log, `Chronossus completed era ${state.era}.`],
    };
  },
};
