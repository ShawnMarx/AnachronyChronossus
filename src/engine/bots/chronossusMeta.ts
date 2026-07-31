import type { BotModule } from './BotModule';

/** Registry descriptor for the Chronossus (logic lives in ./chronossus). */
export const chronossus: BotModule = {
  id: 'chronossus',
  name: 'Chronossus',
  description:
    'The advanced automa — a more human-like opponent with an Energy Pool, modular Action tiles, Autoleap, and Solo Objectives.',
  supportedExpansions: ['base'],
  // Flipped on in Feature 7 once the guided engine + view are wired (admin-gated).
  implemented: false,
};
