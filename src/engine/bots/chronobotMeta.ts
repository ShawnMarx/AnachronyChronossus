import type { BotModule } from './BotModule';

/** Registry descriptor for the Chronobot (logic lives in ./chronobot). */
export const chronobot: BotModule = {
  id: 'chronobot',
  name: 'Chronobot',
  description:
    'The original base-game solo opponent. A simpler automa driven by the AI die — a good first solo opponent.',
  supportedExpansions: ['base'],
  implemented: true,
};
