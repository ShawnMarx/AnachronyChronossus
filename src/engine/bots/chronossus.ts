import type { BotModule } from './BotModule';

/**
 * The Chronossus automa — the primary long-term target for this app.
 *
 * Scaffold only for now: registered so it appears in the setup screen, but its
 * guided phase engine (Energy Pool draws, Action tiles, Autoleap, Solo
 * Objectives) is implemented after the Chronobot v1 (see docs/PLAN.md).
 */
export const chronossus: BotModule = {
  id: 'chronossus',
  name: 'Chronossus',
  description:
    'The Chronossus automa — a more human-like opponent with module support. (Coming after Chronobot v1.)',
  supportedExpansions: ['base', 'exosuit-command', 'doomsday', 'fractures-of-time'],
  implemented: false,
};
