import type { GameState, Instruction } from '../state';
import type { BotModule } from './BotModule';

/**
 * The original Chronobot from the Anachrony base game.
 *
 * NOTE: Scaffold only. Chronobot resolves via die rolls against a reference
 * table; that table and its era-by-era behaviour will be filled in here.
 */
export const chronobot: BotModule = {
  id: 'chronobot',
  name: 'Chronobot',
  description: 'The original base-game Chronobot solo opponent.',
  supportedExpansions: ['base'],

  setup() {
    return {
      // TODO: seed Chronobot resource track and starting position.
    };
  },

  planTurn(state: GameState): Instruction[] {
    const placeholder: Instruction[] = [
      {
        id: `era-${state.era}-roll`,
        text: 'Roll the Chronobot die and consult the reference table.',
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
      log: [...state.log, `Chronobot completed era ${state.era}.`],
    };
  },
};
